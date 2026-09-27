package zm.eoz.platform.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
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
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/** Defined metrics: each family is computed, defined, permission-checked, and moves by exactly the data added. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MetricsTest {

    private static final String PASSWORD = "Password123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private MetricsService metrics;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void reachAndDataQualityMoveByExactlyWhatWasAdded() {
        LocalDate today = LocalDate.now(MetricsService.ZONE);
        MetricsService.Report before = metrics.compute(today, today);
        MetricsService.Report yesterdayBefore = metrics.compute(today.minusDays(1), today.minusDays(1));

        UUID category = jdbc.queryForObject("select id from opportunity_categories where code = 'JOBS'", UUID.class);
        String ref = "IT-MET-" + System.nanoTime();
        // A published listing with 200 views, 30 clicks, 4 shares, a missing email route and a thin description.
        jdbc.update("insert into opportunities (reference, slug, title, category_id, organisation_name, description, status,"
                        + " application_mode, published_at, views_count, apply_clicks, share_count, verified)"
                        + " values (?, ?, 'Metrics IT', ?, 'IT Org', 'Short.', 'PUBLISHED', 'EMPLOYER_EMAIL', now(), 200, 30, 4, false)",
                ref, ref.toLowerCase(), category);

        MetricsService.Report after = metrics.compute(today, today);
        assertThat(delta(before, after, "reach.listings")).isEqualTo(1);
        assertThat(delta(before, after, "reach.views")).isEqualTo(200);
        assertThat(delta(before, after, "reach.applyClicks")).isEqualTo(30);
        assertThat(delta(before, after, "reach.shares")).isEqualTo(4);
        assertThat(delta(before, after, "quality.missingRoute")).isEqualTo(1);
        assertThat(delta(before, after, "quality.incomplete")).isEqualTo(1);
        assertThat(delta(before, after, "quality.unverifiedSource")).isEqualTo(1);
        assertThat(delta(before, after, "quality.noDeadline")).isEqualTo(1);

        // Yesterday's window does not include today's listing.
        MetricsService.Report yesterdayAfter = metrics.compute(today.minusDays(1), today.minusDays(1));
        assertThat(delta(yesterdayBefore, yesterdayAfter, "reach.views")).isZero();
        assertThat(delta(yesterdayBefore, yesterdayAfter, "reach.listings")).isZero();

        jdbc.update("delete from opportunities where reference = ?", ref);
    }

    @Test
    void everyFamilyIsDefinedAndStaffOnly() throws Exception {
        Cookie admin = login(staff("ADMIN"));
        mockMvc.perform(get("/api/v1/admin/reports/metrics").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.timeZone").value("Africa/Lusaka"))
                .andExpect(jsonPath("$.data.families.length()").value(6))
                .andExpect(jsonPath("$.data.families[*].key").value(org.hamcrest.Matchers.containsInAnyOrder(
                        "reach", "publication", "funnel", "employers", "services", "quality")))
                .andExpect(jsonPath("$.data.families[*].metrics[*].definition").value(
                        org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.not(org.hamcrest.Matchers.emptyString()))));
        mockMvc.perform(get("/api/v1/admin/reports/metrics.csv").cookie(admin).param("from", "2026-01-01").param("to", "2026-01-31"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.startsWith("Family,Metric,Value,Unit,Definition")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("2026-01-01 to 2026-01-31 (Africa/Lusaka)")));

        mockMvc.perform(get("/api/v1/admin/reports/metrics").cookie(admin).param("from", "2026-03-01").param("to", "2026-02-01"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/admin/reports/metrics").cookie(admin).param("from", "2024-01-01").param("to", "2026-01-01"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/admin/reports/metrics").cookie(login(staff("CANDIDATE"))))
                .andExpect(status().isForbidden());
    }

    private static double value(MetricsService.Report report, String key) {
        return report.families().stream().flatMap(f -> f.metrics().stream())
                .filter(m -> m.key().equals(key)).findFirst().map(m -> m.value() == null ? 0 : m.value()).orElseThrow();
    }

    private static double delta(MetricsService.Report before, MetricsService.Report after, String key) {
        return value(after, key) - value(before, key);
    }

    private String staff(String role) {
        String email = "it-metrics-" + role.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
        User user = new User();
        user.setFullName("IT Metrics " + role);
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
