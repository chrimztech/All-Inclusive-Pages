package zm.eoz.platform.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/** Signed unsubscribe links in optional email, the one-click endpoint, undo, and preference enforcement. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UnsubscribeTest {

    private static final Pattern LINK = Pattern.compile("/unsubscribe\\?token=([A-Za-z0-9_\\-]+\\.[A-Za-z0-9_\\-]+)");

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationService notificationService;

    @Test
    void jobAlertEmailCarriesAWorkingUnsubscribeLinkAndOneClickHeader() throws Exception {
        User user = newUser();
        notificationService.notify(user, "JOB_ALERT", "New opportunities match your alert", "Data Analyst at Zambeef");

        Map<String, Object> delivery = lastDelivery(user);
        String body = (String) delivery.get("body");
        String header = (String) delivery.get("list_unsubscribe_url");
        assertThat(body).contains("http://localhost:8082/unsubscribe?token=");
        assertThat(header).startsWith("http://localhost:8081/api/v1/unsubscribe?token=");
        String token = token(body);

        mockMvc.perform(get("/api/v1/unsubscribe").param("token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scope").value("ALERTS"))
                .andExpect(jsonPath("$.data.alertsEnabled").value(true))
                .andExpect(jsonPath("$.data.maskedEmail").value(org.hamcrest.Matchers.startsWith("i***@")));

        // What Gmail/Outlook send for one-click unsubscribe: a form POST with no session.
        mockMvc.perform(post("/api/v1/unsubscribe").param("token", token)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED).content("List-Unsubscribe=One-Click"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.alertsEnabled").value(false))
                .andExpect(jsonPath("$.data.serviceEnabled").value(true));
        assertThat(flag(user, "opportunity_alerts_enabled")).isFalse();
        assertThat(jdbc.queryForObject(
                        "select count(*) from consents where user_id = ? and consent_type = 'OPPORTUNITY_ALERTS'"
                                + " and not granted and source = 'EMAIL_UNSUBSCRIBE'",
                        Long.class, user.getId()))
                .isEqualTo(1);

        // Repeating it is harmless and records nothing new.
        mockMvc.perform(post("/api/v1/unsubscribe").param("token", token)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject(
                        "select count(*) from consents where user_id = ? and source = 'EMAIL_UNSUBSCRIBE'", Long.class, user.getId()))
                .isEqualTo(1);

        mockMvc.perform(post("/api/v1/unsubscribe/undo").param("token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.alertsEnabled").value(true));
        assertThat(flag(user, "opportunity_alerts_enabled")).isTrue();
    }

    @Test
    void serviceUnsubscribeStopsServiceEmailButNotSecurityEmail() throws Exception {
        User user = newUser();
        notificationService.notify(user, "SERVICE_QUOTE_ISSUED", "Your quote is ready", "Quote Q-1 for ZMW 450");
        String token = token((String) lastDelivery(user).get("body"));

        mockMvc.perform(post("/api/v1/unsubscribe").param("token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scope").value("SERVICE"))
                .andExpect(jsonPath("$.data.serviceEnabled").value(false))
                .andExpect(jsonPath("$.data.alertsEnabled").value(true));

        long before = deliveries(user);
        notificationService.notify(userRepository.findById(user.getId()).orElseThrow(),
                "SERVICE_QUOTE_ISSUED", "Another quote", "Quote Q-2");
        assertThat(deliveries(user)).isEqualTo(before);

        // Account-security email always goes out and has no unsubscribe link.
        notificationService.notify(user, "SECURITY_NOTICE", "New sign-in", "A new device signed in.");
        Map<String, Object> security = lastDelivery(user);
        assertThat(security.get("notification_type")).isEqualTo("SECURITY_NOTICE");
        assertThat((String) security.get("body")).doesNotContain("unsubscribe");
        assertThat(security.get("list_unsubscribe_url")).isNull();
    }

    @Test
    void forgedOrMalformedTokensAreRejected() throws Exception {
        User user = newUser();
        notificationService.notify(user, "JOB_ALERT", "Alert", "Listing");
        String token = token((String) lastDelivery(user).get("body"));
        // Same signature, payload switched to another scope.
        String forged = java.util.Base64.getUrlEncoder().withoutPadding()
                        .encodeToString((user.getId() + ":ALL").getBytes(java.nio.charset.StandardCharsets.UTF_8))
                + token.substring(token.indexOf('.'));

        for (String bad : new String[] {forged, "not-a-token", token + "x"}) {
            mockMvc.perform(post("/api/v1/unsubscribe").param("token", bad))
                    .andExpect(status().isBadRequest());
        }
        assertThat(flag(user, "opportunity_alerts_enabled")).isTrue();
        assertThat(flag(user, "service_comms_enabled")).isTrue();
    }

    // ---------------------------------------------------------------- helpers

    private User newUser() {
        User user = new User();
        user.setFullName("IT Unsubscribe");
        user.setEmail("it-unsub-" + UUID.randomUUID() + "@example.zm");
        user.setPasswordHash("!not-used");
        return userRepository.saveAndFlush(user);
    }

    private Map<String, Object> lastDelivery(User user) {
        return jdbc.queryForMap(
                "select d.* from notification_deliveries d join notifications n on n.id = d.notification_id"
                        + " where n.user_id = ? order by d.created_at desc, d.id desc limit 1",
                user.getId());
    }

    private long deliveries(User user) {
        return jdbc.queryForObject(
                "select count(*) from notification_deliveries d join notifications n on n.id = d.notification_id where n.user_id = ?",
                Long.class, user.getId());
    }

    private boolean flag(User user, String column) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select " + column + " from users where id = ?", Boolean.class, user.getId()));
    }

    private static String token(String body) {
        Matcher m = LINK.matcher(body);
        assertThat(m.find()).as("unsubscribe link in: " + body).isTrue();
        return m.group(1);
    }
}
