package zm.eoz.platform.recruitment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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

/** Structured interview scorecards: criteria per project, required per-criterion scores, weighted results. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ScorecardTest {

    private static final String OFFICER_EMAIL = "it-scorecard-officer@example.zm";
    private static final String PASSWORD = "Password123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void feedbackMustScoreEveryCriterionAndReportsAWeightedScore() throws Exception {
        Cookie officer = officerLogin();
        String projectId = id(json(post("/api/v1/recruitment/projects").cookie(officer),
                "{\"title\":\"Scorecard IT " + System.nanoTime() + "\"}"));
        String technical = id(json(post("/api/v1/recruitment/projects/" + projectId + "/scorecard").cookie(officer),
                "{\"name\":\"Technical skills\",\"guidance\":\"SQL and Excel\",\"weight\":3}"));
        String communication = id(json(post("/api/v1/recruitment/projects/" + projectId + "/scorecard").cookie(officer),
                "{\"name\":\"Communication\",\"weight\":1}"));
        // Duplicate names and bad weights are refused.
        json(post("/api/v1/recruitment/projects/" + projectId + "/scorecard").cookie(officer), "{\"name\":\"communication\"}")
                .andExpect(status().isConflict());
        json(post("/api/v1/recruitment/projects/" + projectId + "/scorecard").cookie(officer), "{\"name\":\"Culture\",\"weight\":9}")
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/recruitment/projects/" + projectId + "/scorecard").cookie(officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].name").value("Technical skills"))
                .andExpect(jsonPath("$.data[0].weight").value(3));

        String candidateId = id(json(post("/api/v1/recruitment/projects/" + projectId + "/candidates").cookie(officer),
                "{\"candidateName\":\"Mutale Banda\",\"candidateEmail\":\"mutale@example.zm\"}"));
        String interviewId = id(json(post("/api/v1/recruitment/candidates/" + candidateId + "/interviews").cookie(officer),
                "{\"scheduledAt\":\"" + Instant.now().plus(1, ChronoUnit.DAYS) + "\",\"mode\":\"ONLINE\"}"));
        String feedbackUrl = "/api/v1/recruitment/interviews/" + interviewId + "/feedback";

        // Missing a criterion.
        json(post(feedbackUrl).cookie(officer),
                "{\"rating\":4,\"scores\":[{\"criterionId\":\"" + technical + "\",\"score\":5}]}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("Communication")));
        // Out-of-range score and unknown recommendation.
        json(post(feedbackUrl).cookie(officer), "{\"rating\":4,\"scores\":[" + score(technical, 6) + "," + score(communication, 3) + "]}")
                .andExpect(status().isBadRequest());
        json(post(feedbackUrl).cookie(officer), "{\"rating\":4,\"recommendation\":\"MAYBE\",\"scores\":["
                        + score(technical, 5) + "," + score(communication, 3) + "]}")
                .andExpect(status().isBadRequest());

        // (5*3 + 2*1) / 4 = 4.25 -> 4.3
        json(post(feedbackUrl).cookie(officer), "{\"rating\":4,\"comments\":\"Strong SQL\",\"recommendation\":\"YES\",\"scores\":["
                        + score(technical, 5) + "," + score(communication, 2) + "]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weightedScore").value(4.3))
                .andExpect(jsonPath("$.data.recommendation").value("YES"))
                .andExpect(jsonPath("$.data.scores.length()").value(2));

        mockMvc.perform(get(feedbackUrl).cookie(officer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].scores[0].name").value("Technical skills"))
                .andExpect(jsonPath("$.data[0].scores[0].score").value(5))
                .andExpect(jsonPath("$.data[0].weightedScore").value(4.3));

        // A scored criterion can't be removed; an unused one can.
        mockMvc.perform(delete("/api/v1/recruitment/projects/" + projectId + "/scorecard/" + technical).cookie(officer))
                .andExpect(status().isConflict());
        String unused = id(json(post("/api/v1/recruitment/projects/" + projectId + "/scorecard").cookie(officer),
                "{\"name\":\"Motivation\"}"));
        mockMvc.perform(delete("/api/v1/recruitment/projects/" + projectId + "/scorecard/" + unused).cookie(officer))
                .andExpect(status().isOk());
    }

    @Test
    void projectsWithoutAScorecardKeepTheSingleRating() throws Exception {
        Cookie officer = officerLogin();
        String projectId = id(json(post("/api/v1/recruitment/projects").cookie(officer),
                "{\"title\":\"No scorecard IT " + System.nanoTime() + "\"}"));
        String candidateId = id(json(post("/api/v1/recruitment/projects/" + projectId + "/candidates").cookie(officer),
                "{\"candidateName\":\"Bwalya Tembo\"}"));
        String interviewId = id(json(post("/api/v1/recruitment/candidates/" + candidateId + "/interviews").cookie(officer),
                "{\"scheduledAt\":\"" + Instant.now().plus(2, ChronoUnit.DAYS) + "\"}"));
        json(post("/api/v1/recruitment/interviews/" + interviewId + "/feedback").cookie(officer), "{\"rating\":3,\"comments\":\"Fine\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").value(3))
                .andExpect(jsonPath("$.data.weightedScore").doesNotExist())
                .andExpect(jsonPath("$.data.scores.length()").value(0));
    }

    @Test
    void scorecardsNeedRecruitmentPermission() throws Exception {
        String email = "it-scorecard-candidate-" + System.nanoTime() + "@example.zm";
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"IT Candidate\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                                + "\",\"accountType\":\"CANDIDATE\"}"))
                .andExpect(status().isOk());
        Cookie candidate = login(email);
        mockMvc.perform(get("/api/v1/recruitment/projects/" + java.util.UUID.randomUUID() + "/scorecard").cookie(candidate))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------- helpers

    private static String score(String criterionId, int score) {
        return "{\"criterionId\":\"" + criterionId + "\",\"score\":" + score + "}";
    }

    private ResultActions json(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String body)
            throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private static String id(ResultActions result) throws Exception {
        MvcResult r = result.andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.id");
    }

    private Cookie officerLogin() throws Exception {
        if (userRepository.findByEmailIgnoreCase(OFFICER_EMAIL).isEmpty()) {
            User user = new User();
            user.setFullName("IT Recruitment Officer");
            user.setEmail(OFFICER_EMAIL);
            user.setPasswordHash(passwordEncoder.encode(PASSWORD));
            user.setRoles(java.util.Set.of(roleRepository.findByName("RECRUITMENT_OFFICER").orElseThrow()));
            userRepository.save(user);
        }
        return login(OFFICER_EMAIL);
    }

    private Cookie login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("eoz_at");
        assertThat(cookie).isNotNull();
        return cookie;
    }
}
