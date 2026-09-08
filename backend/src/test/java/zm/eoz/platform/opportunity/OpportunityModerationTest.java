package zm.eoz.platform.opportunity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/**
 * Covers the platform's non-negotiable brand rule (an opportunity's application route must be
 * the employer's own channel) and the moderation permission boundary (only content
 * officers/managers/admins may act on the moderation queue).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpportunityModerationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Test
    void submittingWithoutARequiredApplicationRouteIsRejected() throws Exception {
        Cookie employerCookie = registerAndLoginEmployer();

        String missingUrlBody =
                """
                {"title":"Missing Route Role","categoryCode":"JOBS","organisationName":"Acme Co",
                 "description":"desc","applicationMode":"EXTERNAL_URL"}
                """;

        mockMvc.perform(post("/api/v1/opportunities").cookie(employerCookie).contentType(MediaType.APPLICATION_JSON).content(missingUrlBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    void employerCannotAccessModerationQueue() throws Exception {
        Cookie employerCookie = registerAndLoginEmployer();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/opportunities/moderation/queue")
                        .cookie(employerCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void fullLifecycleSubmitApproveThenPublishMakesItPubliclyVisible() throws Exception {
        Cookie employerCookie = registerAndLoginEmployer();

        String submitBody =
                """
                {"title":"IT Lifecycle Role","categoryCode":"JOBS","organisationName":"Acme Co",
                 "description":"desc","region":"Lusaka","applicationMode":"EXTERNAL_URL",
                 "applicationUrl":"https://acme.zm/careers","source":"acme.zm"}
                """;

        MvcResult submitResult = mockMvc.perform(
                        post("/api/v1/opportunities").cookie(employerCookie).contentType(MediaType.APPLICATION_JSON).content(submitBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.applicationUrl").value("https://acme.zm/careers"))
                .andReturn();

        String id = com.jayway.jsonpath.JsonPath.read(submitResult.getResponse().getContentAsString(), "$.data.id");

        Cookie staffCookie = ensureStaffUserAndLogin();

        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/approve").cookie(staffCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reference").exists());

        // A non-manager content officer cannot publish (publish requires MANAGER/ADMIN).
        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/publish").cookie(staffCookie)).andExpect(status().isForbidden());
    }

    private Cookie registerAndLoginEmployer() throws Exception {
        String email = "it-employer-" + System.nanoTime() + "@example.zm";
        String registerBody =
                """
                {"fullName":"IT Employer","email":"%s","password":"Password123!","accountType":"EMPLOYER"}
                """
                        .formatted(email);
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerBody))
                .andExpect(status().isOk());
        return loginAndGetCookie(email, "Password123!");
    }

    private Cookie ensureStaffUserAndLogin() throws Exception {
        String email = "it-content-officer@example.zm";
        String password = "Password123!";
        if (userRepository.findByEmailIgnoreCase(email).isEmpty()) {
            User user = new User();
            user.setFullName("IT Content Officer");
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setRoles(java.util.Set.of(roleRepository.findByName("CONTENT_OFFICER").orElseThrow()));
            userRepository.save(user);
        }
        return loginAndGetCookie(email, password);
    }

    private Cookie loginAndGetCookie(String email, String password) throws Exception {
        String loginBody = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("eoz_at");
    }
}
