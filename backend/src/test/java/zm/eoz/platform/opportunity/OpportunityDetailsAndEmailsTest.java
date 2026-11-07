package zm.eoz.platform.opportunity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/** Free-form opportunity details are kept exactly as typed, and a listing can carry several application emails. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpportunityDetailsAndEmailsTest {

    private static final String PASSWORD = "Password123!";

    /** A real multi-position advert, as staff paste it in. */
    private static final String KINGSWORTH_DETAILS = """
            ## Available Positions

            1. Instrumentation Engineer – 1 Position
            2. R/O Operator – 2 Positions
            3. Boiler/Utility In-Charge – 1 Position
            4. Welder – 1 Position
            5. Mechanical Fitter – 4 Positions
            6. Auto-Mechanic (Electrical & Mechanical)
            7. Refrigeration Technician – 1 Position

            ## 🔹 Key Requirements

            - Relevant qualifications in the respective technical fields.
            - 2–5 years of relevant experience, depending on the position.
            - Grade 12 Certificate.

            Note: Specific qualifications and experience requirements vary by position.

            ## 📩 How to Apply

            Submit the following:

            - Detailed CV.
            - Certified copies of academic and professional certificates.
            - Traceable references.

            Address applications to:
            The Human Resource Manager
            Kingsworth Group Limited
            PH5IND/13, Tokyo Way, Multi-Facility Economic Zone, Lusaka.

            Only shortlisted candidates will be contacted.""";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void aMultiPositionAdvertIsPublishedWithItsDetailsAndEveryContactIntact() throws Exception {
        Cookie admin = login(staff("ADMIN"));
        Map<String, Object> body = listing("MULTIPLE POSITIONS – KINGSWORTH GROUP LIMITED " + System.nanoTime());
        body.put("requirements", KINGSWORTH_DETAILS);
        body.put("applicationEmail", "miyoba@kingsworth.co.zm; hr@kingsworth.co.zm  miyoba@kingsworth.co.zm");
        body.put("applicationCc", "recruitment@kingsworth.co.zm");
        body.put("applicationBcc", "records@kingsworth.co.zm");
        body.put("publishNow", true);

        MvcResult created = create(admin, body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.requirements").value(KINGSWORTH_DETAILS))
                .andExpect(jsonPath("$.data.applicationEmail").value("miyoba@kingsworth.co.zm, hr@kingsworth.co.zm"))
                .andExpect(jsonPath("$.data.applicationCc").value("recruitment@kingsworth.co.zm"))
                .andExpect(jsonPath("$.data.applicationBcc").value("records@kingsworth.co.zm"))
                .andReturn();

        // Public readers get exactly the same text and contacts.
        String slug = JsonPath.read(created.getResponse().getContentAsString(), "$.data.slug");
        mockMvc.perform(get("/api/v1/opportunities/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.requirements").value(KINGSWORTH_DETAILS))
                .andExpect(jsonPath("$.data.applicationCc").value("recruitment@kingsworth.co.zm"));

        // Editing can add and clear contacts.
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(patch("/api/v1/opportunities/manage/" + id).cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"applicationCc\":\"a@kingsworth.co.zm, b@kingsworth.co.zm\",\"applicationBcc\":\"\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/opportunities/" + slug))
                .andExpect(jsonPath("$.data.applicationCc").value("a@kingsworth.co.zm, b@kingsworth.co.zm"))
                .andExpect(jsonPath("$.data.applicationBcc").doesNotExist());
    }

    @Test
    void invalidOrTooManyAddressesAreRejectedWithAClearMessage() throws Exception {
        Cookie admin = login(staff("ADMIN"));

        Map<String, Object> bad = listing("Bad email " + System.nanoTime());
        bad.put("applicationCc", "not-an-email");
        create(admin, bad)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("\"not-an-email\" isn't a valid CC email address."));

        Map<String, Object> many = listing("Too many emails " + System.nanoTime());
        StringBuilder cc = new StringBuilder();
        for (int i = 0; i < 10; i++) cc.append("person").append(i).append("@example.zm, ");
        many.put("applicationCc", cc.toString());
        create(admin, many)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A listing can have at most 10 application email addresses."));
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> listing(String title) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", title);
        body.put("categoryCode", "JOBS");
        body.put("organisationName", "Kingsworth Group Limited");
        body.put("description", "Kingsworth Group Limited is hiring for multiple technical positions.\nContract · Up to ZMW 8,000 per month");
        body.put("region", "Lusaka");
        body.put("applicationMode", "EMPLOYER_EMAIL");
        body.put("applicationEmail", "miyoba@kingsworth.co.zm");
        body.put("deadline", Instant.now().plus(Duration.ofDays(30)).toString());
        return body;
    }

    private ResultActions create(Cookie cookie, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/v1/opportunities").cookie(cookie).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private String staff(String role) {
        String email = "it-details-" + role.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
        User user = new User();
        user.setFullName("IT " + role);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setRoles(java.util.Set.of(roleRepository.findByName(role).orElseThrow()));
        userRepository.save(user);
        return email;
    }

    private Cookie login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("eoz_at");
    }
}
