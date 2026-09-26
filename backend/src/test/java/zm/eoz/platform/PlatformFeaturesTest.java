package zm.eoz.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
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
import zm.eoz.platform.notification.NotificationService;

/**
 * Board ordering (top listings), the organisation directory's top-recruiter ranking, the notification bell's
 * endpoints, optional application routes, and flagging of permanently deleted items after a real
 * pg_dump / pg_restore round trip.
 */
@SpringBootTest(properties = "eoz.backup.dir=target/it-backups")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PlatformFeaturesTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private zm.eoz.platform.backup.RestoreFlagService restoreFlagService;

    @Test
    void topOrderRanksListingsByViewsAndSearchMatchesReference() throws Exception {
        String tag = "Ordering" + System.nanoTime();
        Cookie employer = registerAndLogin("EMPLOYER");
        Map<String, String> quiet = submit(employer, tag + " Quiet Role", "EOZ_HOSTED", null);
        Map<String, String> popular = submit(employer, tag + " Popular Role", "EOZ_HOSTED", null);
        publish(quiet.get("id"), 3, null);
        publish(popular.get("id"), 250, null);

        mockMvc.perform(get("/api/v1/opportunities").param("q", tag).param("order", "top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].id").value(popular.get("id")))
                .andExpect(jsonPath("$.data.items[0].viewsCount").value(250));

        mockMvc.perform(get("/api/v1/opportunities").param("q", popular.get("reference").toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].id").value(popular.get("id")));

        mockMvc.perform(get("/api/v1/opportunities").param("order", "loudest")).andExpect(status().isBadRequest());
    }

    @Test
    void directoryRanksTopRecruitersByLiveListings() throws Exception {
        String tag = "Recruiter" + System.nanoTime();
        UUID small = insertOrganisation(tag + " Small Ltd", "VERIFIED");
        UUID big = insertOrganisation(tag + " Big Ltd", "PENDING");
        Cookie employer = registerAndLogin("EMPLOYER");
        publish(submit(employer, tag + " A", "EOZ_HOSTED", null).get("id"), 0, small);
        for (int i = 0; i < 3; i++) {
            publish(submit(employer, tag + " B" + i, "EOZ_HOSTED", null).get("id"), 0, big);
        }

        mockMvc.perform(get("/api/v1/organisations").param("q", tag).param("order", "top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").value(big.toString()))
                .andExpect(jsonPath("$.data.items[0].listingsCount").value(3))
                .andExpect(jsonPath("$.data.items[1].id").value(small.toString()));

        mockMvc.perform(get("/api/v1/organisations").param("q", tag).param("verifiedOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].id").value(small.toString()));
    }

    @Test
    void notificationBellCanLimitAndMarkEverythingRead() throws Exception {
        String email = "it-bell-" + System.nanoTime() + "@example.zm";
        Cookie cookie = registerAndLogin("CANDIDATE", email);
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        for (int i = 0; i < 3; i++) {
            notificationService.notify(user, "TEST", "Bell test " + i, "body");
        }

        mockMvc.perform(get("/api/v1/notifications/mine").param("limit", "2").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
        mockMvc.perform(get("/api/v1/notifications/mine/unread-count").cookie(cookie))
                .andExpect(jsonPath("$.data").value(4)); // 3 + the email-verification notice from sign-up
        mockMvc.perform(post("/api/v1/notifications/mine/read-all").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(4));
        mockMvc.perform(get("/api/v1/notifications/mine/unread-count").cookie(cookie))
                .andExpect(jsonPath("$.data").value(0));
    }

    @Test
    void applicationRouteIsOptionalAndCanBeChangedLater() throws Exception {
        Cookie employer = registerAndLogin("EMPLOYER");
        // No careers portal and no source link: applying by email is enough.
        Map<String, String> listing = submit(employer, "No Portal Role " + System.nanoTime(), "EMPLOYER_EMAIL", "jobs@smallco.zm");

        String toPortalWithoutLink = """
                {"applicationMode":"EXTERNAL_URL"}
                """;
        mockMvc.perform(patch("/api/v1/opportunities/manage/" + listing.get("id")).cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON).content(toPortalWithoutLink))
                .andExpect(status().isBadRequest());

        String toEozHosted = """
                {"applicationMode":"EOZ_HOSTED"}
                """;
        mockMvc.perform(patch("/api/v1/opportunities/manage/" + listing.get("id")).cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON).content(toEozHosted))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.applicationMode").value("EOZ_HOSTED"));
    }

    @Test
    void permanentlyDeletedListingIsFlaggedAndQuarantinedAfterRestore() throws Exception {
        Cookie admin = adminLogin();
        Cookie employer = registerAndLogin("EMPLOYER");
        Map<String, String> listing = submit(employer, "Restore Flag Role " + System.nanoTime(), "EOZ_HOSTED", null);
        String id = listing.get("id");
        publish(id, 0, null);

        MvcResult backupResult = mockMvc.perform(post("/api/v1/admin/system/backups").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andReturn();
        String backupId = JsonPath.read(backupResult.getResponse().getContentAsString(), "$.data.id");
        String fileName = JsonPath.read(backupResult.getResponse().getContentAsString(), "$.data.fileName");

        mockMvc.perform(delete("/api/v1/admin/permanent-delete/opportunities/" + id)
                        .param("confirm", listing.get("reference"))
                        .cookie(admin))
                .andExpect(status().isNoContent());
        assertThat(count("select count(*) from opportunities where id = ?::uuid", id)).isZero();

        String restoreBody = """
                {"confirmFileName":"%s"}
                """.formatted(fileName);
        MvcResult restoreResult = mockMvc.perform(post("/api/v1/admin/system/backups/" + backupId + "/restore")
                        .cookie(admin).contentType(MediaType.APPLICATION_JSON).content(restoreBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true))
                .andReturn();
        int flaggedCount = JsonPath.read(restoreResult.getResponse().getContentAsString(), "$.data.flaggedCount");
        assertThat(flaggedCount).isGreaterThanOrEqualTo(1);

        // The listing is back, but out of public view until someone decides.
        assertThat(jdbc.queryForObject("select status from opportunities where id = ?::uuid", String.class, id))
                .isEqualTo("PENDING_REVIEW");
        // The ledger and the backup list (including the pre-restore safety backup) survived the rewind.
        assertThat(count("select count(*) from deletion_ledger where entity_id = ?::uuid", id)).isEqualTo(1);
        String safety = JsonPath.read(restoreResult.getResponse().getContentAsString(), "$.data.safetyBackupFileName");
        assertThat(count("select count(*) from system_backups where file_name = ?", safety)).isEqualTo(1);

        Cookie adminAfter = adminLogin(); // sessions issued after the backup were rewound with it
        MvcResult flags = mockMvc.perform(get("/api/v1/admin/system/backups/restore-flags").cookie(adminAfter))
                .andExpect(status().isOk())
                .andReturn();
        List<String> flagIds = JsonPath.read(
                flags.getResponse().getContentAsString(),
                "$.data[?(@.entityId == '" + id + "' && @.resolution == null)].id");
        assertThat(flagIds).hasSize(1);
        List<String> quarantinedFrom = JsonPath.read(
                flags.getResponse().getContentAsString(), "$.data[?(@.entityId == '" + id + "')].quarantinedFrom");
        assertThat(quarantinedFrom).containsExactly("PUBLISHED");

        mockMvc.perform(post("/api/v1/admin/system/backups/restore-flags/" + flagIds.get(0) + "/keep").cookie(adminAfter))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("select status from opportunities where id = ?::uuid", String.class, id))
                .isEqualTo("PUBLISHED");
        mockMvc.perform(post("/api/v1/admin/system/backups/restore-flags/" + flagIds.get(0) + "/keep").cookie(adminAfter))
                .andExpect(status().isBadRequest());

        // A later restore must not re-flag something an administrator already chose to keep.
        User adminUser = userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).orElseThrow();
        restoreFlagService.reconcile(restoreFlagService.capture(), "later.dump", adminUser);
        assertThat(count("select count(*) from restore_flags where entity_id = ?::uuid and resolution is null", id)).isZero();
    }

    @Test
    void backupsTakenInTheSameSecondNeverShareAFile() throws Exception {
        Cookie admin = adminLogin();
        String first = JsonPath.read(
                mockMvc.perform(post("/api/v1/admin/system/backups").cookie(admin)).andReturn().getResponse().getContentAsString(),
                "$.data.fileName");
        String second = JsonPath.read(
                mockMvc.perform(post("/api/v1/admin/system/backups").cookie(admin)).andReturn().getResponse().getContentAsString(),
                "$.data.fileName");
        assertThat(second).isNotEqualTo(first);
    }

    @Test
    void deleteAgainRepeatsThePermanentDelete() throws Exception {
        Cookie admin = adminLogin();
        User adminUser = userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).orElseThrow();
        Cookie employer = registerAndLogin("EMPLOYER");
        Map<String, String> listing = submit(employer, "Delete Again Role " + System.nanoTime(), "EOZ_HOSTED", null);
        String id = listing.get("id");
        UUID ledgerId = UUID.randomUUID();
        jdbc.update(
                "insert into deletion_ledger (id, entity_type, entity_id, label, confirm_value, deleted_by_name) values (?, 'Opportunity', ?::uuid, ?, ?, ?)",
                ledgerId, id, "Delete Again Role", listing.get("reference"), adminUser.getFullName());
        UUID flagId = UUID.randomUUID();
        jdbc.update(
                "insert into restore_flags (id, ledger_id, entity_type, entity_id, label, deleted_at, restored_from) values (?, ?, 'Opportunity', ?::uuid, 'Delete Again Role', now(), 'it.dump')",
                flagId, ledgerId, id);

        mockMvc.perform(post("/api/v1/admin/system/backups/restore-flags/" + flagId + "/delete-again").cookie(admin))
                .andExpect(status().isNoContent());
        assertThat(count("select count(*) from opportunities where id = ?::uuid", id)).isZero();
        assertThat(jdbc.queryForObject("select resolution from restore_flags where id = ?", String.class, flagId))
                .isEqualTo("DELETED_AGAIN");
    }

    // ---------------------------------------------------------------- helpers

    private static final String ADMIN_EMAIL = "it-platform-admin@example.zm";

    private Map<String, String> submit(Cookie employer, String title, String mode, String route) throws Exception {
        String routeField = switch (mode) {
            case "EMPLOYER_EMAIL" -> ",\"applicationEmail\":\"" + route + "\"";
            case "EXTERNAL_URL" -> ",\"applicationUrl\":\"" + route + "\"";
            default -> "";
        };
        String body = """
                {"title":"%s","categoryCode":"JOBS","organisationName":"IT Org","description":"desc",
                 "region":"Lusaka","applicationMode":"%s"%s}
                """.formatted(title, mode, routeField);
        MvcResult result = mockMvc.perform(post("/api/v1/opportunities").cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn();
        String json = result.getResponse().getContentAsString();
        return Map.of("id", JsonPath.read(json, "$.data.id"), "reference", JsonPath.read(json, "$.data.reference"));
    }

    private void publish(String id, long views, UUID organisationId) {
        jdbc.update(
                "update opportunities set status = 'PUBLISHED', published_at = now(), views_count = ?,"
                        + " organisation_id = coalesce(?, organisation_id) where id = ?::uuid",
                views, organisationId, id);
    }

    private UUID insertOrganisation(String name, String verification) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into organisations (id, legal_name, verification_status) values (?, ?, ?)", id, name, verification);
        return id;
    }

    private long count(String sql, Object arg) {
        Long value = jdbc.queryForObject(sql, Long.class, arg);
        return value == null ? 0 : value;
    }

    private Cookie registerAndLogin(String accountType) throws Exception {
        return registerAndLogin(accountType, "it-" + accountType.toLowerCase() + "-" + System.nanoTime() + "@example.zm");
    }

    private Cookie registerAndLogin(String accountType, String email) throws Exception {
        String body = """
                {"fullName":"IT User","email":"%s","password":"Password123!","accountType":"%s"}
                """.formatted(email, accountType);
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        return login(email, "Password123!");
    }

    private Cookie adminLogin() throws Exception {
        String password = "Password123!";
        if (userRepository.findByEmailIgnoreCase(ADMIN_EMAIL).isEmpty()) {
            User user = new User();
            user.setFullName("IT Platform Admin");
            user.setEmail(ADMIN_EMAIL);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setRoles(java.util.Set.of(roleRepository.findByName("ADMIN").orElseThrow()));
            userRepository.save(user);
        }
        return login(ADMIN_EMAIL, password);
    }

    private Cookie login(String email, String password) throws Exception {
        String body = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getCookie("eoz_at");
    }
}
