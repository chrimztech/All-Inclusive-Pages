package zm.eoz.platform.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

/**
 * Exercises the real auth flow end-to-end against a Postgres-backed Spring context:
 * register, login (cookie issued), /me with the cookie, and rejection of bad credentials.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void registerThenLoginThenMe() throws Exception {
        String email = "it-candidate-" + System.nanoTime() + "@example.zm";
        String registerBody =
                """
                {"fullName":"IT Candidate","email":"%s","password":"Password123!","accountType":"CANDIDATE"}
                """
                        .formatted(email);

        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roles[0]").value("CANDIDATE"));

        String loginBody =
                """
                {"email":"%s","password":"Password123!"}
                """
                        .formatted(email);

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isOk())
                .andReturn();

        Cookie accessCookie = loginResult.getResponse().getCookie("eoz_at");
        assertThat(accessCookie).isNotNull();

        mockMvc.perform(get("/api/v1/auth/me").cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(email));
    }

    @Test
    void loginWithWrongPasswordIsRejected() throws Exception {
        String email = "it-wrongpass-" + System.nanoTime() + "@example.zm";
        String registerBody =
                """
                {"fullName":"Wrong Pass","email":"%s","password":"Password123!","accountType":"CANDIDATE"}
                """
                        .formatted(email);
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerBody))
                .andExpect(status().isOk());

        String badLogin =
                """
                {"email":"%s","password":"WrongPassword!"}
                """
                        .formatted(email);
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(badLogin))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meWithoutCookieIsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isForbidden());
    }
}
