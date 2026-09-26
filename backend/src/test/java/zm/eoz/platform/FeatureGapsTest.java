package zm.eoz.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import zm.eoz.platform.candidate.AlertDispatchService;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/**
 * Listing engagement (apply clicks, shares), curation (featured), deadline extension, renewing listings,
 * testimonials, service-order ratings, organisation verification evidence, and alert/reminder delivery.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeatureGapsTest {

    private static final String ADMIN_EMAIL = "it-gaps-admin@example.zm";

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AlertDispatchService alertDispatchService;

    @Test
    void applyClicksAndSharesAreCountedOnlyForLiveListings() throws Exception {
        Cookie employer = registerAndLogin("EMPLOYER", null);
        String live = submit(employer, "Clicks Live " + System.nanoTime());
        String pending = submit(employer, "Clicks Pending " + System.nanoTime());
        publish(live);

        mockMvc.perform(post("/api/v1/opportunities/" + live + "/apply-click")).andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/opportunities/" + live + "/apply-click")).andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/opportunities/" + live + "/share")).andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/opportunities/" + pending + "/apply-click")).andExpect(status().isNoContent());

        assertThat(number("select apply_clicks from opportunities where id = ?::uuid", live)).isEqualTo(2);
        assertThat(number("select share_count from opportunities where id = ?::uuid", live)).isEqualTo(1);
        assertThat(number("select apply_clicks from opportunities where id = ?::uuid", pending)).isZero();
    }

    @Test
    void staffCanFeatureLiveListingsAndTheBoardCanFilterThem() throws Exception {
        Cookie admin = adminLogin();
        Cookie employer = registerAndLogin("EMPLOYER", null);
        String tag = "Featured" + System.nanoTime();
        String live = submit(employer, tag + " Live");
        String pending = submit(employer, tag + " Pending");
        publish(live);

        mockMvc.perform(patch("/api/v1/opportunities/" + live + "/feature").cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"featured\":true}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/opportunities/" + pending + "/feature").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"featured\":true}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/v1/opportunities/" + live + "/feature").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"featured\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.featured").value(true));

        mockMvc.perform(get("/api/v1/opportunities").param("featured", "true").param("q", tag))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].id").value(live));
    }

    @Test
    void extendingAClosedListingNeedsAReasonAndRepublishesIt() throws Exception {
        Cookie admin = adminLogin();
        Cookie employer = registerAndLogin("EMPLOYER", null);
        String id = submit(employer, "Extend Me " + System.nanoTime());
        jdbc.update("update opportunities set status = 'CLOSED', deadline = now() - interval '1 day' where id = ?::uuid", id);
        String future = Instant.now().plus(10, ChronoUnit.DAYS).toString();

        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/extend").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"deadline\":\"" + future + "\",\"reason\":\"\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/extend").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deadline\":\"2000-01-01T00:00:00Z\",\"reason\":\"Employer asked for more time\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/extend").cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deadline\":\"" + future + "\",\"reason\":\"Employer asked for more time\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/extend").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deadline\":\"" + future + "\",\"reason\":\"Employer asked for more time\"}"))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select status from opportunities where id = ?::uuid", String.class, id))
                .isEqualTo("PUBLISHED");
        assertThat(number(
                        "select count(*) from audit_events where action = 'DEADLINE_EXTENDED' and summary like ?",
                        "%Employer asked for more time%"))
                .isGreaterThanOrEqualTo(1);
    }

    @Test
    void ownerCanRenewAListingButStrangersCannot() throws Exception {
        Cookie owner = registerAndLogin("EMPLOYER", null);
        Cookie stranger = registerAndLogin("EMPLOYER", null);
        String id = submit(owner, "Renew Me " + System.nanoTime());
        jdbc.update("update opportunities set status = 'CLOSED' where id = ?::uuid", id);

        mockMvc.perform(post("/api/v1/opportunities/manage/" + id + "/renew").cookie(stranger))
                .andExpect(status().isForbidden());
        MvcResult renewed = mockMvc.perform(post("/api/v1/opportunities/manage/" + id + "/renew").cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deadline").doesNotExist())
                .andReturn();
        String copyId = JsonPath.read(renewed.getResponse().getContentAsString(), "$.data.id");
        assertThat(copyId).isNotEqualTo(id);
        assertThat(jdbc.queryForObject("select status from opportunities where id = ?::uuid", String.class, copyId))
                .isEqualTo("PENDING_REVIEW");
        assertThat(jdbc.queryForObject(
                        "select flagged_duplicate_of::text from opportunities where id = ?::uuid", String.class, copyId))
                .isEqualTo(id);
    }

    @Test
    void testimonialsAreManagedByAdminsAndOnlyActiveOnesArePublic() throws Exception {
        Cookie admin = adminLogin();
        Cookie employer = registerAndLogin("EMPLOYER", null);
        String author = "Mutale " + System.nanoTime();
        String body = "{\"authorName\":\"" + author + "\",\"authorRole\":\"Graduate, Kitwe\","
                + "\"quote\":\"EOZ helped me find my first job within weeks.\",\"active\":false}";

        mockMvc.perform(post("/api/v1/admin/testimonials").cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        MvcResult created = mockMvc.perform(post("/api/v1/admin/testimonials").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        mockMvc.perform(get("/api/v1/testimonials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.authorName == '" + author + "')]").isEmpty());
        mockMvc.perform(patch("/api/v1/admin/testimonials/" + id).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content(body.replace("\"active\":false", "\"active\":true")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/testimonials"))
                .andExpect(jsonPath("$.data[?(@.authorName == '" + author + "')]").isNotEmpty());
    }

    @Test
    void customersRateCompletedOrdersOnce() throws Exception {
        String email = "it-rater-" + System.nanoTime() + "@example.zm";
        Cookie customer = registerAndLogin("CANDIDATE", email);
        Cookie other = registerAndLogin("CANDIDATE", null);
        MvcResult order = mockMvc.perform(post("/api/v1/services/orders").cookie(customer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"cv-writing\",\"requirements\":\"Data roles\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String orderId = JsonPath.read(order.getResponse().getContentAsString(), "$.data.id");
        String rating = "{\"rating\":5,\"comment\":\"Clear, fast and professional.\"}";

        mockMvc.perform(post("/api/v1/services/orders/" + orderId + "/feedback").cookie(customer)
                        .contentType(MediaType.APPLICATION_JSON).content(rating))
                .andExpect(status().isBadRequest()); // not completed yet
        jdbc.update("update service_orders set status = 'COMPLETED' where id = ?::uuid", orderId);
        mockMvc.perform(post("/api/v1/services/orders/" + orderId + "/feedback").cookie(other)
                        .contentType(MediaType.APPLICATION_JSON).content(rating))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/services/orders/" + orderId + "/feedback").cookie(customer)
                        .contentType(MediaType.APPLICATION_JSON).content(rating))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").value(5));
        mockMvc.perform(post("/api/v1/services/orders/" + orderId + "/feedback").cookie(customer)
                        .contentType(MediaType.APPLICATION_JSON).content(rating))
                .andExpect(status().isBadRequest());
    }

    @Test
    void membersUploadVerificationEvidenceAndItMovesToReview() throws Exception {
        Cookie member = registerAndLogin("EMPLOYER", null);
        Cookie outsider = registerAndLogin("EMPLOYER", null);
        MvcResult org = mockMvc.perform(post("/api/v1/organisations").cookie(member)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Evidence Test Ltd " + System.nanoTime() + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String orgId = JsonPath.read(org.getResponse().getContentAsString(), "$.data.id");
        MockMultipartFile pdf = new MockMultipartFile("file", "pacra-certificate.pdf", "application/pdf", "%PDF-1.4 test".getBytes());

        mockMvc.perform(multipart("/api/v1/organisations/" + orgId + "/verification-documents").file(pdf).cookie(outsider))
                .andExpect(status().isForbidden());
        mockMvc.perform(multipart("/api/v1/organisations/" + orgId + "/verification-documents").file(pdf).cookie(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fileName").value("pacra-certificate.pdf"));

        mockMvc.perform(get("/api/v1/organisations/" + orgId + "/verification-documents").cookie(member))
                .andExpect(jsonPath("$.data.length()").value(1));
        mockMvc.perform(get("/api/v1/organisations/" + orgId + "/verification-documents").cookie(outsider))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/organisations/" + orgId + "/verification-documents").cookie(adminLogin()))
                .andExpect(jsonPath("$.data.length()").value(1));
        assertThat(jdbc.queryForObject(
                        "select verification_status from organisations where id = ?::uuid", String.class, orgId))
                .isEqualTo("UNDER_REVIEW");
    }

    @Test
    void alertsAndClosingRemindersAreDeliveredExactlyOnce() throws Exception {
        String email = "it-alerts-" + System.nanoTime() + "@example.zm";
        Cookie candidate = registerAndLogin("CANDIDATE", email);
        UUID userId = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
        String keyword = "Zebrafinch" + System.nanoTime();
        mockMvc.perform(post("/api/v1/candidate/alerts").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"keyword\":\"" + keyword + "\",\"frequency\":\"INSTANT\"}"))
                .andExpect(status().isOk());

        Cookie employer = registerAndLogin("EMPLOYER", null);
        String match = submit(employer, keyword + " Analyst");
        submit(employer, "Unrelated Role " + System.nanoTime());
        publish(match);

        alertDispatchService.dispatchInstant();
        alertDispatchService.dispatchInstant();
        assertThat(number("select count(*) from notifications where user_id = ?::uuid and type = 'JOB_ALERT' and body like ?",
                        userId.toString(), "%" + keyword + "%"))
                .isEqualTo(1);

        // Saved listing closing within 48h -> one reminder.
        jdbc.update("update opportunities set deadline = now() + interval '20 hours' where id = ?::uuid", match);
        mockMvc.perform(post("/api/v1/candidate/saved/" + match).cookie(candidate)).andExpect(status().isNoContent());
        alertDispatchService.dispatchDeadlineReminders();
        alertDispatchService.dispatchDeadlineReminders();
        assertThat(number("select count(*) from notifications where user_id = ?::uuid and type = 'DEADLINE_REMINDER'",
                        userId.toString()))
                .isEqualTo(1);

        // A weekly digest that is due collects matches published since the last one.
        String weekly = "Kingfisher" + System.nanoTime();
        mockMvc.perform(post("/api/v1/candidate/alerts").cookie(candidate)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"keyword\":\"" + weekly + "\",\"frequency\":\"WEEKLY\"}"))
                .andExpect(status().isOk());
        jdbc.update("update alert_subscriptions set created_at = now() - interval '8 days' where keyword = ?", weekly);
        publish(submit(employer, weekly + " Officer"));
        alertDispatchService.dispatchDigests();
        alertDispatchService.dispatchDigests();
        assertThat(number("select count(*) from notifications where user_id = ?::uuid and title like 'Your weekly%' and body like ?",
                        userId.toString(), "%" + weekly + "%"))
                .isEqualTo(1);
    }

    // ---------------------------------------------------------------- helpers

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

    private void publish(String id) {
        jdbc.update("update opportunities set status = 'PUBLISHED', published_at = now() where id = ?::uuid", id);
    }

    private long number(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private Cookie registerAndLogin(String accountType, String email) throws Exception {
        String address = email != null ? email : "it-gaps-" + accountType.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
        String body = """
                {"fullName":"IT User","email":"%s","password":"Password123!","accountType":"%s"}
                """.formatted(address, accountType);
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        return login(address);
    }

    private Cookie adminLogin() throws Exception {
        if (userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).isEmpty()) {
            User user = new User();
            user.setFullName("IT Gaps Admin");
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
