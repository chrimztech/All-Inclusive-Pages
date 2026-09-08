package zm.eoz.platform.candidate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

/**
 * Regression test for a bug where updating a candidate's profile crashed: the first save (no
 * row exists yet) must go through JPA's persist path and the second (row now exists) through
 * merge — both must succeed against the same entity/service code.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CandidateProfileTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void creatingThenUpdatingProfileBothSucceed() throws Exception {
        Cookie cookie = registerAndLoginCandidate();

        String firstUpdate = """
                {"headline":"Data Analyst","bio":"First bio","location":"Lusaka","skills":"SQL"}
                """;
        mockMvc.perform(patch("/api/v1/candidate/profile").cookie(cookie).contentType(MediaType.APPLICATION_JSON).content(firstUpdate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("Data Analyst"));

        String secondUpdate = """
                {"headline":"Senior Data Analyst","bio":"Updated bio","location":"Lusaka","skills":"SQL,Python"}
                """;
        mockMvc.perform(patch("/api/v1/candidate/profile").cookie(cookie).contentType(MediaType.APPLICATION_JSON).content(secondUpdate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("Senior Data Analyst"))
                .andExpect(jsonPath("$.data.skills").value("SQL,Python"));

        mockMvc.perform(get("/api/v1/candidate/profile").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("Senior Data Analyst"));
    }

    private Cookie registerAndLoginCandidate() throws Exception {
        String email = "it-profile-" + System.nanoTime() + "@example.zm";
        String registerBody =
                """
                {"fullName":"IT Profile Candidate","email":"%s","password":"Password123!","accountType":"CANDIDATE"}
                """
                        .formatted(email);
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerBody))
                .andExpect(status().isOk());

        String loginBody = """
                {"email":"%s","password":"Password123!"}
                """.formatted(email);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("eoz_at");
    }
}
