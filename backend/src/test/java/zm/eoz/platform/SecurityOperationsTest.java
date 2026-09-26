package zm.eoz.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
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
import zm.eoz.platform.export.ExportService;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.notification.EmailDeliveryService;
import zm.eoz.platform.notification.NotificationService;
import zm.eoz.platform.security.TotpService;

/**
 * Login lockout and security alerts, two-step sign-in, the retrying email outbox, background exports with masking,
 * account erasure, and the published OpenAPI document.
 */
@SpringBootTest(properties = "eoz.export.dir=target/it-exports")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityOperationsTest {

    private static final String ADMIN_EMAIL = "it-secops-admin@example.zm";
    private static final String PASSWORD = "Password123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TotpService totpService;
    @Autowired private EmailDeliveryService emailDeliveryService;
    @Autowired private NotificationService notificationService;
    @Autowired private ExportService exportService;

    @Test
    void fiveWrongPasswordsLockTheAccountAndAlertAdministrators() throws Exception {
        adminLogin();
        String email = unique("lockout");
        register("CANDIDATE", email);
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content(credentials(email, "wrong-" + i)))
                    .andExpect(status().isUnauthorized());
        }
        // Even the right password is refused while locked.
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(email, PASSWORD)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("temporarily locked")));

        UUID userId = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
        assertThat(count("select count(*) from notifications where user_id = ? and type = 'ACCOUNT_LOCKED'", userId)).isEqualTo(1);
        UUID adminId = userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).orElseThrow().getId();
        assertThat(count("select count(*) from notifications where user_id = ? and type = 'SECURITY_ALERT' and body like ?",
                        adminId, "%" + email + "%"))
                .isEqualTo(1);

        // An administrator re-activating the account lifts the lock.
        mockMvc.perform(patch("/api/v1/admin/users/" + userId + "/status").cookie(adminLogin())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isOk());
        login(email);
    }

    @Test
    void twoStepSignInNeedsASecondFactorAndRecoveryCodesWorkOnce() throws Exception {
        String email = unique("mfa");
        Cookie cookie = register("CANDIDATE", email);
        MvcResult setup = mockMvc.perform(post("/api/v1/auth/mfa/setup").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.otpauthUri").value(org.hamcrest.Matchers.startsWith("otpauth://totp/")))
                .andReturn();
        String secret = JsonPath.read(setup.getResponse().getContentAsString(), "$.data.secret");

        mockMvc.perform(post("/api/v1/auth/mfa/enable").cookie(cookie).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest());
        String code = totpService.codeAt(secret, Instant.now().getEpochSecond() / 30);
        MvcResult enabled = mockMvc.perform(post("/api/v1/auth/mfa/enable").cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(8))
                .andReturn();
        List<String> recovery = JsonPath.read(enabled.getResponse().getContentAsString(), "$.data");

        // Password alone no longer signs in.
        MvcResult first = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mfaRequired").value(true))
                .andReturn();
        assertThat(first.getResponse().getCookie("eoz_at")).isNull();
        String challenge = JsonPath.read(first.getResponse().getContentAsString(), "$.data.challengeId");

        // The code used to enable two-step cannot be replayed.
        mockMvc.perform(post("/api/v1/auth/mfa/verify").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"challengeId\":\"" + challenge + "\",\"code\":\"" + code + "\"}"))
                .andExpect(status().isBadRequest());
        MvcResult verified = mockMvc.perform(post("/api/v1/auth/mfa/verify").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"challengeId\":\"" + challenge + "\",\"code\":\"" + recovery.get(0) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mfaEnabled").value(true))
                .andReturn();
        assertThat(verified.getResponse().getCookie("eoz_at")).isNotNull();

        // A recovery code works only once.
        MvcResult second = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, PASSWORD))).andReturn();
        String challenge2 = JsonPath.read(second.getResponse().getContentAsString(), "$.data.challengeId");
        mockMvc.perform(post("/api/v1/auth/mfa/verify").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"challengeId\":\"" + challenge2 + "\",\"code\":\"" + recovery.get(0) + "\"}"))
                .andExpect(status().isBadRequest());

        Cookie session = verified.getResponse().getCookie("eoz_at");
        mockMvc.perform(post("/api/v1/auth/mfa/disable").cookie(session).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"" + PASSWORD + "\",\"code\":\"" + recovery.get(1) + "\"}"))
                .andExpect(status().isNoContent());
        login(email);
    }

    @Test
    void emailsAreQueuedRetriedAndParkedWhenTheyKeepFailing() throws Exception {
        String email = unique("outbox");
        register("CANDIDATE", email);
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        notificationService.notify(user, "APPLICATION_STATUS", "Outbox test", "body");
        UUID delivery = jdbc.queryForObject(
                "select id from notification_deliveries where recipient = ? and subject = 'Outbox test'", UUID.class, email);

        jdbc.update("update notification_deliveries set next_attempt_at = now() - interval '1 second' where id = ?", delivery);
        drainUntilAttempted(delivery); // no mail server in tests: this attempt fails
        assertThat(jdbc.queryForObject("select status from notification_deliveries where id = ?", String.class, delivery))
                .isEqualTo("RETRY");
        assertThat(jdbc.queryForObject("select next_attempt_at > now() from notification_deliveries where id = ?", Boolean.class, delivery))
                .isTrue();

        jdbc.update("update notification_deliveries set status = 'RETRY', attempts = 4, next_attempt_at = now() - interval '1 second' where id = ?", delivery);
        drainUntilAttempted(delivery);
        assertThat(jdbc.queryForObject("select status from notification_deliveries where id = ?", String.class, delivery))
                .isEqualTo("DEAD");

        Cookie admin = adminLogin();
        mockMvc.perform(get("/api/v1/admin/notifications/deliveries").param("status", "DEAD").cookie(admin))
                .andExpect(jsonPath("$.data[?(@.id == '" + delivery + "')]").isNotEmpty());
        mockMvc.perform(post("/api/v1/admin/notifications/deliveries/" + delivery + "/retry").cookie(admin))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("select status from notification_deliveries where id = ?", String.class, delivery))
                .isEqualTo("PENDING");
    }

    @Test
    void exportsRespectPermissionsMaskPersonalDataAndDefuseFormulas() throws Exception {
        Cookie admin = adminLogin();
        Cookie employer = register("EMPLOYER", unique("export-employer"));
        mockMvc.perform(post("/api/v1/admin/exports").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"USERS\"}"))
                .andExpect(status().isForbidden());

        String title = "=HYPERLINK(\"http://evil\") " + System.nanoTime();
        jdbc.update("update opportunities set title = ? where id = (select id from opportunities order by created_at desc limit 1)", title);
        MvcResult users = mockMvc.perform(post("/api/v1/admin/exports").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"USERS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("QUEUED"))
                .andReturn();
        MvcResult opps = mockMvc.perform(post("/api/v1/admin/exports").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPPORTUNITIES\"}"))
                .andReturn();
        String usersId = JsonPath.read(users.getResponse().getContentAsString(), "$.data.id");
        String oppsId = JsonPath.read(opps.getResponse().getContentAsString(), "$.data.id");
        while (exportService.processQueue() > 0) {
            // drain the queue, including exports left by other tests
        }

        String usersCsv = mockMvc.perform(get("/api/v1/admin/exports/" + usersId + "/download").cookie(admin))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(usersCsv).contains("full_name,email").contains("i***@example.zm").doesNotContain(ADMIN_EMAIL);
        String oppsCsv = mockMvc.perform(get("/api/v1/admin/exports/" + oppsId + "/download").cookie(admin))
                .andReturn().getResponse().getContentAsString();
        assertThat(oppsCsv).contains("\"'=HYPERLINK(\"\"http://evil\"\")").doesNotContain(",=HYPERLINK");

        mockMvc.perform(get("/api/v1/admin/exports/" + usersId + "/download").cookie(employer)).andExpect(status().isNotFound());
    }

    @Test
    void accountDeletionErasesPersonalDataAfterConfirmationOrCanBeCancelled() throws Exception {
        Cookie admin = adminLogin();
        String email = unique("erase");
        Cookie candidate = register("CANDIDATE", email);
        UUID userId = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
        mockMvc.perform(post("/api/v1/candidate/profile/languages").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"Tonga\",\"proficiency\":\"NATIVE\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/candidate/privacy/delete-request").cookie(candidate)).andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/candidate/privacy/delete-request").cookie(candidate)).andExpect(status().is4xxClientError());
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(credentials(email, PASSWORD)))
                .andExpect(status().isUnauthorized());

        MvcResult list = mockMvc.perform(get("/api/v1/admin/privacy/requests").param("status", "PENDING").cookie(admin))
                .andExpect(status().isOk()).andReturn();
        List<String> ids = JsonPath.read(list.getResponse().getContentAsString(), "$.data[?(@.userId == '" + userId + "')].id");
        assertThat(ids).hasSize(1);
        mockMvc.perform(post("/api/v1/admin/privacy/requests/" + ids.get(0) + "/complete").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.subjectLabel").value("Erased account"));
        assertThat(jdbc.queryForObject("select email from users where id = ?", String.class, userId)).startsWith("erased-");
        assertThat(count("select count(*) from candidate_languages where user_id = ?", userId)).isZero();
        assertThat(count("select count(*) from consents where user_id = ?", userId)).isGreaterThan(0); // evidence kept
        mockMvc.perform(post("/api/v1/admin/privacy/requests/" + ids.get(0) + "/cancel").cookie(admin))
                .andExpect(status().isBadRequest());

        // A second person changes their mind.
        String email2 = unique("erase-cancel");
        Cookie candidate2 = register("CANDIDATE", email2);
        UUID user2 = userRepository.findByEmailIgnoreCase(email2).orElseThrow().getId();
        mockMvc.perform(post("/api/v1/candidate/privacy/delete-request").cookie(candidate2)).andExpect(status().isNoContent());
        String id2 = jdbc.queryForObject("select id::text from privacy_requests where user_id = ?", String.class, user2);
        mockMvc.perform(post("/api/v1/admin/privacy/requests/" + id2 + "/cancel").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"notes\":\"Called to keep the account\"}"))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
        login(email2);

        mockMvc.perform(post("/api/v1/admin/privacy/retention/run").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessions").exists());
    }

    @Test
    void openApiDocumentIsPublished() throws Exception {
        mockMvc.perform(get("/api/v1/openapi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("Echo Opportunities Zambia API"))
                .andExpect(jsonPath("$.components.securitySchemes.session.name").value("eoz_at"))
                .andExpect(jsonPath("$.paths['/api/v1/auth/mfa/verify']").exists());
    }

    // ---------------------------------------------------------------- helpers

    /** Other tests leave emails queued; keep sending batches until this one has been attempted. */
    private void drainUntilAttempted(UUID delivery) {
        for (int i = 0; i < 200; i++) {
            String status = jdbc.queryForObject("select status from notification_deliveries where id = ?", String.class, delivery);
            Boolean due = jdbc.queryForObject("select next_attempt_at <= now() from notification_deliveries where id = ?", Boolean.class, delivery);
            if (!Boolean.TRUE.equals(due) && !"PENDING".equals(status)) return;
            if ("DEAD".equals(status)) return;
            emailDeliveryService.sendDue();
        }
    }

    private static String unique(String prefix) {
        return "it-" + prefix + "-" + System.nanoTime() + "@example.zm";
    }

    private static String credentials(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private long count(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private Cookie register(String accountType, String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"IT User\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                                + "\",\"accountType\":\"" + accountType + "\"}"))
                .andExpect(status().isOk());
        return login(email);
    }

    private Cookie adminLogin() throws Exception {
        if (userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).isEmpty()) {
            User user = new User();
            user.setFullName("IT SecOps Admin");
            user.setEmail(ADMIN_EMAIL);
            user.setPasswordHash(passwordEncoder.encode(PASSWORD));
            user.setRoles(java.util.Set.of(roleRepository.findByName("ADMIN").orElseThrow()));
            userRepository.save(user);
        }
        return login(ADMIN_EMAIL);
    }

    private Cookie login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookie = result.getResponse().getCookie("eoz_at");
        assertThat(cookie).as("session cookie for " + email).isNotNull();
        return cookie;
    }
}
