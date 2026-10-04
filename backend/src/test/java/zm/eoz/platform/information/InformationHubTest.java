package zm.eoz.platform.information;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InformationHubTest {

    private static final String ADMIN_EMAIL = "it-information-hub-admin@example.zm";
    private static final String PASSWORD = "Password123!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void draftsStayPrivateAndStaffCanManageTheFullPublishingLifecycle() throws Exception {
        String tag = "Guide " + System.nanoTime();
        String createBody = requestBody(tag, "A public-ready introduction", false);

        // The default public page has neither search nor category parameters.
        mockMvc.perform(get("/api/v1/information-hub"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(3)));

        mockMvc.perform(post("/api/v1/admin/information-hub")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isUnauthorized());

        Cookie admin = adminLogin();
        MvcResult createResult = mockMvc.perform(post("/api/v1/admin/information-hub")
                        .cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.category").value("APPLICATION_ADVICE"))
                .andReturn();

        String id = JsonPath.read(createResult.getResponse().getContentAsString(), "$.data.id");
        String slug = JsonPath.read(createResult.getResponse().getContentAsString(), "$.data.slug");

        mockMvc.perform(get("/api/v1/information-hub").param("q", tag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(0));
        mockMvc.perform(get("/api/v1/information-hub/" + slug)).andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/admin/information-hub/" + id + "/publish").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.publishedAt").isNotEmpty());

        mockMvc.perform(get("/api/v1/information-hub")
                        .param("q", tag)
                        .param("category", "APPLICATION_ADVICE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].slug").value(slug));
        mockMvc.perform(get("/api/v1/information-hub/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value(tag));

        mockMvc.perform(patch("/api/v1/admin/information-hub/" + id)
                        .cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody(tag + " updated", "The updated introduction", true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.featured").value(true))
                .andExpect(jsonPath("$.data.slug").value(slug));

        mockMvc.perform(post("/api/v1/admin/information-hub/" + id + "/unpublish").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
        mockMvc.perform(get("/api/v1/information-hub/" + slug)).andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/admin/information-hub/" + id).cookie(admin))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/admin/information-hub").cookie(admin).param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).doesNotContain(id));
    }

    @Test
    void rejectsUnknownCategoriesAndUnsafeSourceUrls() throws Exception {
        Cookie admin = adminLogin();
        String body = requestBody("Validation " + System.nanoTime(), "Validation excerpt", false)
                .replace("APPLICATION_ADVICE", "NOT_A_CATEGORY");
        mockMvc.perform(post("/api/v1/admin/information-hub")
                        .cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/admin/information-hub")
                        .cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("Unsafe " + System.nanoTime(), "Unsafe URL excerpt", false)
                                .replace("https://example.org", "javascript:alert(1)")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.sourceUrl").exists());
    }

    private static String requestBody(String title, String excerpt, boolean featured) {
        return """
                {
                  "title":"%s",
                  "excerpt":"%s",
                  "body":"This guide contains enough practical detail to pass validation. It gives readers a clear next step and useful context before they take action.",
                  "category":"APPLICATION_ADVICE",
                  "featured":%s,
                  "sourceName":"Example source",
                  "sourceUrl":"https://example.org"
                }
                """.formatted(title, excerpt, featured);
    }

    private Cookie adminLogin() throws Exception {
        if (userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).isEmpty()) {
            User user = new User();
            user.setFullName("Information Hub Admin");
            user.setEmail(ADMIN_EMAIL);
            user.setPasswordHash(passwordEncoder.encode(PASSWORD));
            user.setRoles(java.util.Set.of(roleRepository.findByName("ADMIN").orElseThrow()));
            userRepository.save(user);
        }
        String body = """
                {"email":"%s","password":"%s"}
                """.formatted(ADMIN_EMAIL, PASSWORD);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("eoz_at");
    }
}
