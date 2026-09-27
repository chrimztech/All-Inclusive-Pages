package zm.eoz.platform.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.Map;
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

/** Correlation ids, audit request metadata, security headers, health probes, password policy, webhook alerts. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HardeningTest {

    private static final String ADMIN_EMAIL = "it-hardening-admin@example.zm";
    private static final String PASSWORD = "Password123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void everyResponseCarriesACorrelationIdThatReachesErrorsAndTheAuditLog() throws Exception {
        // Generated when absent, echoed when well-formed, replaced when unsafe.
        String generated = mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getHeader("X-Request-Id");
        assertThat(generated).matches("[0-9a-f-]{36}");
        mockMvc.perform(get("/api/v1/categories").header("X-Request-Id", "proxy-abc12345"))
                .andExpect(header().string("X-Request-Id", "proxy-abc12345"));
        String replaced = mockMvc.perform(get("/api/v1/categories").header("X-Request-Id", "bad\r\nInjected: yes"))
                .andReturn().getResponse().getHeader("X-Request-Id");
        assertThat(replaced).doesNotContain("Injected");

        // Problem details include it, so a user can quote it to support.
        mockMvc.perform(post("/api/v1/auth/login").header("X-Request-Id", "support-case-0001")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.requestId").value("support-case-0001"));

        // Audit events record the correlation id, client IP and user agent.
        Cookie admin = adminLogin();
        MvcResult project = mockMvc.perform(post("/api/v1/recruitment/projects").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Hardening IT " + System.nanoTime() + "\"}"))
                .andExpect(status().isOk()).andReturn();
        String projectId = JsonPath.read(project.getResponse().getContentAsString(), "$.data.id");
        String requestId = "audit-trace-" + System.nanoTime();
        mockMvc.perform(post("/api/v1/recruitment/projects/" + projectId + "/scorecard").cookie(admin)
                        .header("X-Request-Id", requestId).header("User-Agent", "HardeningTest/1.0")
                        .with(r -> {
                            r.setRemoteAddr("198.51.100.7");
                            return r;
                        })
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Integrity\"}"))
                .andExpect(status().isOk());
        Map<String, Object> event = jdbc.queryForMap(
                "select correlation_id, ip, user_agent from audit_events where action = 'SCORECARD_CRITERION_ADDED'"
                        + " and correlation_id = ?",
                requestId);
        assertThat(event.get("ip")).isEqualTo("198.51.100.7");
        assertThat(event.get("user_agent")).isEqualTo("HardeningTest/1.0");
    }

    @Test
    void securityHeadersAreSetAndProbesArePublic() throws Exception {
        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Permissions-Policy", org.hamcrest.Matchers.containsString("camera=()")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
        // The Swagger UI must be able to run its scripts.
        mockMvc.perform(get("/api/v1/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Content-Security-Policy"));

        // Unknown sort fields are a client error, and page sizes are capped.
        for (String sort : new String[] {"nonexistent", "title;drop table users", "id) --"}) {
            mockMvc.perform(get("/api/v1/opportunities").param("sort", sort)).andExpect(status().isBadRequest());
            // The organisation directory has its own allow-listed "order" parameter and ignores raw sort text.
            mockMvc.perform(get("/api/v1/organisations").param("sort", sort)).andExpect(status().isOk());
        }
        mockMvc.perform(get("/api/v1/opportunities").param("size", "100000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.size").value(200));

        mockMvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mockMvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void weakAndBreachedPasswordsAreRefusedEverywhereAPasswordIsChosen() throws Exception {
        String email = "chanda.mwila." + System.nanoTime() + "@example.zm";
        for (String[] bad : new String[][] {
                {"password123", "data breaches"},
                {"Zambia2026", "data breaches"},
                {"aaaaaaaaaa", "too easy"},
                {"chandaRocks!9", "your name"},
                {"x" + email.split("@")[0] + "!", "email address"},
        }) {
            mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"fullName\":\"Chanda Mwila\",\"email\":\"" + email + "\",\"password\":\"" + bad[0]
                                    + "\",\"accountType\":\"CANDIDATE\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString(bad[1])));
        }
        assertThat(userRepository.findByEmailIgnoreCase(email)).isEmpty();

        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Chanda Mwila\",\"email\":\"" + email
                                + "\",\"password\":\"Kafue-River-Sunset-42\",\"accountType\":\"CANDIDATE\"}"))
                .andExpect(status().isOk());

        // Changing to a common password is refused too.
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Kafue-River-Sunset-42\"}"))
                .andExpect(status().isOk()).andReturn();
        mockMvc.perform(post("/api/v1/auth/change-password").cookie(login.getResponse().getCookie("eoz_at"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"Kafue-River-Sunset-42\",\"newPassword\":\"qwerty123\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void repeatedBadWebhookSignaturesAlertAdministratorsOnce() throws Exception {
        adminLogin();
        String provider = "it-gateway-" + System.nanoTime();
        for (int i = 0; i < 7; i++) {
            mockMvc.perform(post("/api/v1/payments/webhook/" + provider).header("X-Signature", "forged-" + i)
                            .contentType(MediaType.APPLICATION_JSON).content("{\"eventId\":\"e" + i + "\"}"))
                    .andExpect(status().isForbidden());
        }
        Long alerts = jdbc.queryForObject(
                "select count(*) from notifications n join users u on u.id = n.user_id"
                        + " where u.email = ? and n.type = 'SECURITY_ALERT' and n.body like ?",
                Long.class, ADMIN_EMAIL, "%'" + provider + "'%");
        assertThat(alerts).isEqualTo(1);
    }

    private Cookie adminLogin() throws Exception {
        if (userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).isEmpty()) {
            User user = new User();
            user.setFullName("IT Hardening Admin");
            user.setEmail(ADMIN_EMAIL);
            user.setPasswordHash(passwordEncoder.encode(PASSWORD));
            user.setRoles(java.util.Set.of(roleRepository.findByName("ADMIN").orElseThrow()));
            userRepository.save(user);
        }
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + ADMIN_EMAIL + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("eoz_at");
    }
}
