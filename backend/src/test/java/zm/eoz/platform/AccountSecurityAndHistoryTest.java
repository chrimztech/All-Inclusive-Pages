package zm.eoz.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/**
 * Privacy export safety, session listing and revocation, consent history, candidate languages and certifications,
 * listing version history, notification templates, verification reviewer notes and the extra board filters.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountSecurityAndHistoryTest {

    private static final String ADMIN_EMAIL = "it-history-admin@example.zm";

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void privacyExportNeverContainsPasswordHashesOrRawEntities() throws Exception {
        Cookie employer = register("EMPLOYER", unique("exp-employer"));
        String listing = submit(employer, "Export Check " + System.nanoTime());
        jdbc.update("update opportunities set status = 'PUBLISHED', published_at = now() where id = ?::uuid", listing);
        Cookie candidate = register("CANDIDATE", unique("exp-candidate"));
        mockMvc.perform(post("/api/v1/opportunities/" + listing + "/applications").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"coverNote\":\"hi\"}"))
                .andExpect(status().isOk());

        MvcResult export = mockMvc.perform(get("/api/v1/candidate/privacy/export").cookie(candidate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.applications[0].opportunityTitle").exists())
                .andReturn();
        String body = export.getResponse().getContentAsString();
        assertThat(body).doesNotContain("passwordHash").doesNotContain("$2a$").doesNotContain("\"createdBy\"");
    }

    @Test
    void sessionsCanBeListedAndRevokedImmediately() throws Exception {
        String email = unique("sessions");
        Cookie first = register("CANDIDATE", email);
        Cookie second = login(email);

        MvcResult listed = mockMvc.perform(get("/api/v1/auth/sessions").cookie(first))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andReturn();
        List<String> others = JsonPath.read(listed.getResponse().getContentAsString(), "$.data[?(@.current == false)].id");
        assertThat(others).hasSize(1);

        mockMvc.perform(get("/api/v1/notifications/mine/unread-count").cookie(second)).andExpect(status().isOk());
        mockMvc.perform(delete("/api/v1/auth/sessions/" + others.get(0)).cookie(first)).andExpect(status().isNoContent());
        // The revoked session's still-unexpired access token no longer works.
        mockMvc.perform(get("/api/v1/notifications/mine/unread-count").cookie(second)).andExpect(status().is4xxClientError());
        mockMvc.perform(get("/api/v1/notifications/mine/unread-count").cookie(first)).andExpect(status().isOk());

        // Another user's session id is not found, never revoked.
        Cookie stranger = register("CANDIDATE", unique("stranger"));
        MvcResult mine = mockMvc.perform(get("/api/v1/auth/sessions").cookie(first)).andReturn();
        String myId = JsonPath.read(mine.getResponse().getContentAsString(), "$.data[0].id");
        mockMvc.perform(delete("/api/v1/auth/sessions/" + myId).cookie(stranger)).andExpect(status().isNotFound());

        Cookie third = login(email);
        mockMvc.perform(post("/api/v1/auth/sessions/revoke-others").cookie(first))
                .andExpect(jsonPath("$.data").value(1));
        mockMvc.perform(get("/api/v1/notifications/mine/unread-count").cookie(third)).andExpect(status().is4xxClientError());
    }

    @Test
    void consentHistoryRecordsSignUpAndEveryChange() throws Exception {
        Cookie user = register("CANDIDATE", unique("consent"));
        mockMvc.perform(get("/api/v1/auth/consents").cookie(user))
                .andExpect(jsonPath("$.data.length()").value(4))
                .andExpect(jsonPath("$.data[?(@.type == 'TERMS' && @.granted == true)]").isNotEmpty());

        mockMvc.perform(patch("/api/v1/auth/notification-preferences").cookie(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"opportunityAlertsEnabled\":false,\"serviceCommsEnabled\":true}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auth/consents").cookie(user))
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[0].type").value("OPPORTUNITY_ALERTS"))
                .andExpect(jsonPath("$.data[0].granted").value(false))
                .andExpect(jsonPath("$.data[0].source").value("ACCOUNT_SETTINGS"));
    }

    @Test
    void candidatesManageTheirOwnLanguagesAndCertifications() throws Exception {
        Cookie candidate = register("CANDIDATE", unique("langs"));
        Cookie other = register("CANDIDATE", unique("langs-other"));

        MvcResult added = mockMvc.perform(post("/api/v1/candidate/profile/languages").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"Bemba\",\"proficiency\":\"native\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.proficiency").value("NATIVE"))
                .andReturn();
        String languageId = JsonPath.read(added.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(post("/api/v1/candidate/profile/languages").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"bemba\",\"proficiency\":\"FLUENT\"}"))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/v1/candidate/profile/languages").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"Nyanja\",\"proficiency\":\"EXPERT\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/v1/candidate/profile/languages/" + languageId).cookie(other))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/candidate/profile/certifications").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"CPA Zambia\",\"credentialUrl\":\"javascript:alert(1)\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/candidate/profile/certifications").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"CPA Zambia\",\"issuer\":\"ZICA\",\"issuedOn\":\"2023-05-01\",\"expiresOn\":\"2024-05-01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].expired").value(true));

        mockMvc.perform(get("/api/v1/candidate/privacy/export").cookie(candidate))
                .andExpect(jsonPath("$.data.languages[0].language").value("Bemba"))
                .andExpect(jsonPath("$.data.certifications[0].name").value("CPA Zambia"));
    }

    @Test
    void listingVersionsCaptureRealChangesButNotPageViews() throws Exception {
        Cookie employer = register("EMPLOYER", unique("versions"));
        Cookie stranger = register("EMPLOYER", unique("versions-stranger"));
        String id = submit(employer, "Versioned Role " + System.nanoTime());
        mockMvc.perform(patch("/api/v1/opportunities/manage/" + id).cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Versioned Role (updated)\"}"))
                .andExpect(status().isOk());
        Cookie admin = adminLogin();
        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/approve").cookie(admin)).andExpect(status().isOk());
        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/publish").cookie(admin)).andExpect(status().isOk());

        MvcResult history = mockMvc.perform(get("/api/v1/opportunities/manage/" + id + "/versions").cookie(employer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data[0].changedByName").value("IT History Admin"))
                .andReturn();
        int count = JsonPath.<List<Object>>read(history.getResponse().getContentAsString(), "$.data").size();
        assertThat(count).isGreaterThanOrEqualTo(3);

        String slug = jdbc.queryForObject("select slug from opportunities where id = ?::uuid", String.class, id);
        mockMvc.perform(get("/api/v1/opportunities/" + slug)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/opportunities/" + slug)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/opportunities/manage/" + id + "/versions").cookie(employer))
                .andExpect(jsonPath("$.data.length()").value(count));
        mockMvc.perform(get("/api/v1/opportunities/manage/" + id + "/versions").cookie(stranger))
                .andExpect(status().isForbidden());
    }

    @Test
    void notificationTemplatesAreValidatedAndSecurityEmailsStayOn() throws Exception {
        Cookie admin = adminLogin();
        Cookie employer = register("EMPLOYER", unique("templates"));
        mockMvc.perform(get("/api/v1/admin/notification-templates").cookie(employer)).andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/admin/notification-templates/APPLICATION_STATUS").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subjectTemplate\":\"Update\",\"bodyTemplate\":\"No details here\",\"emailEnabled\":true}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/v1/admin/notification-templates/APPLICATION_STATUS").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subjectTemplate\":\"EOZ: {{title}}\",\"bodyTemplate\":\"Dear {{name}},\\n{{body}}\",\"emailEnabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customised").value(true))
                .andExpect(jsonPath("$.data.emailEnabled").value(false));
        mockMvc.perform(put("/api/v1/admin/notification-templates/PASSWORD_RESET").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subjectTemplate\":\"Reset\",\"bodyTemplate\":\"{{body}}\",\"emailEnabled\":false}"))
                .andExpect(jsonPath("$.data.emailEnabled").value(true));
        mockMvc.perform(delete("/api/v1/admin/notification-templates/APPLICATION_STATUS").cookie(admin))
                .andExpect(jsonPath("$.data.customised").value(false));
        mockMvc.perform(delete("/api/v1/admin/notification-templates/PASSWORD_RESET").cookie(admin));
    }

    @Test
    void membersSeeReviewerNotesButOutsidersDoNot() throws Exception {
        Cookie member = register("EMPLOYER", unique("reviews"));
        Cookie outsider = register("EMPLOYER", unique("reviews-out"));
        MvcResult org = mockMvc.perform(post("/api/v1/organisations").cookie(member)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Review Notes Ltd " + System.nanoTime() + "\"}"))
                .andReturn();
        String orgId = JsonPath.read(org.getResponse().getContentAsString(), "$.data.id");
        mockMvc.perform(patch("/api/v1/organisations/" + orgId + "/verification").cookie(adminLogin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"REJECTED\",\"notes\":\"PACRA certificate is illegible — please re-upload.\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/organisations/" + orgId + "/verification-reviews").cookie(member))
                .andExpect(jsonPath("$.data[0].decision").value("REJECTED"))
                .andExpect(jsonPath("$.data[0].notes").value("PACRA certificate is illegible — please re-upload."));
        mockMvc.perform(get("/api/v1/organisations/" + orgId + "/verification-reviews").cookie(outsider))
                .andExpect(status().isForbidden());
    }

    @Test
    void boardFiltersByDatePostedAndMinimumSalary() throws Exception {
        Cookie employer = register("EMPLOYER", unique("filters"));
        String tag = "Filterable" + System.nanoTime();
        String recentWellPaid = submit(employer, tag + " Senior");
        String oldListing = submit(employer, tag + " Old");
        String hiddenPay = submit(employer, tag + " Hidden Pay");
        jdbc.update("update opportunities set status = 'PUBLISHED', published_at = now(), salary_visible = true,"
                + " salary_min = 15000, salary_max = 25000 where id = ?::uuid", recentWellPaid);
        jdbc.update("update opportunities set status = 'PUBLISHED', published_at = now() - interval '40 days', salary_visible = true,"
                + " salary_min = 30000 where id = ?::uuid", oldListing);
        jdbc.update("update opportunities set status = 'PUBLISHED', published_at = now(), salary_visible = false,"
                + " salary_min = 90000 where id = ?::uuid", hiddenPay);

        mockMvc.perform(get("/api/v1/opportunities").param("q", tag).param("postedWithinDays", "7"))
                .andExpect(jsonPath("$.data.items.length()").value(2));
        mockMvc.perform(get("/api/v1/opportunities").param("q", tag).param("minSalary", "20000"))
                .andExpect(jsonPath("$.data.items.length()").value(2));
        mockMvc.perform(get("/api/v1/opportunities").param("q", tag).param("minSalary", "20000").param("postedWithinDays", "7"))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].id").value(recentWellPaid));
    }

    // ---------------------------------------------------------------- helpers

    private static String unique(String prefix) {
        return "it-" + prefix + "-" + System.nanoTime() + "@example.zm";
    }

    private String submit(Cookie employer, String title) throws Exception {
        String body = """
                {"title":"%s","categoryCode":"JOBS","organisationName":"IT Org","description":"desc",
                 "region":"Lusaka","applicationMode":"EOZ_HOSTED"}
                """.formatted(title);
        MvcResult result = mockMvc.perform(post("/api/v1/opportunities").cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private Cookie register(String accountType, String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"IT User\",\"email\":\"" + email + "\",\"password\":\"Password123!\",\"accountType\":\""
                                + accountType + "\"}"))
                .andExpect(status().isOk());
        return login(email);
    }

    private Cookie adminLogin() throws Exception {
        if (userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).isEmpty()) {
            User user = new User();
            user.setFullName("IT History Admin");
            user.setEmail(ADMIN_EMAIL);
            user.setPasswordHash(passwordEncoder.encode("Password123!"));
            user.setRoles(java.util.Set.of(roleRepository.findByName("ADMIN").orElseThrow()));
            userRepository.save(user);
        }
        return login(ADMIN_EMAIL);
    }

    private Cookie login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("eoz_at");
    }
}
