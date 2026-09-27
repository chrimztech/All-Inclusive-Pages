package zm.eoz.platform.opportunity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/** Permissions exposed to the web app, edit-conflict protection (If-Match), and listing attachments. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ListingSafeguardsTest {

    private static final String PASSWORD = "Password123!";
    private static final byte[] PDF = "%PDF-1.7 official advert".getBytes();

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void meListsThePermissionsOfTheSignedInPersonsRoles() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me").cookie(login(staff("FINANCE_OFFICER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.permissions").value(org.hamcrest.Matchers.hasItem("FINANCE_MANAGE")))
                .andExpect(jsonPath("$.data.permissions").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("USER_MANAGE"))));
        mockMvc.perform(get("/api/v1/auth/me").cookie(register("CANDIDATE")))
                .andExpect(jsonPath("$.data.permissions.length()").value(0));
    }

    @Test
    void aStaleEditIsRefusedInsteadOfOverwritingNewerChanges() throws Exception {
        Cookie employer = register("EMPLOYER");
        String id = submit(employer, "Conflict IT " + System.nanoTime());
        int version = JsonPath.read(manage(employer, id), "$.data.version");

        // First editor saves with the version they loaded.
        mockMvc.perform(patch("/api/v1/opportunities/manage/" + id).cookie(employer).header("If-Match", "\"" + version + "\"")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"First editor's text\"}"))
                .andExpect(status().isOk());
        // Second editor still holds the old version: refused, and the first edit survives.
        mockMvc.perform(patch("/api/v1/opportunities/manage/" + id).cookie(employer).header("If-Match", "\"" + version + "\"")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"Second editor's text\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("Someone else changed this listing")));
        assertThat(jdbc.queryForObject("select description from opportunities where id = ?::uuid", String.class, id))
                .isEqualTo("First editor's text");
        // Clients that don't send If-Match keep working.
        mockMvc.perform(patch("/api/v1/opportunities/manage/" + id).cookie(employer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"No version sent\"}"))
                .andExpect(status().isOk());

        // Same protection on organisation profiles.
        MvcResult org = mockMvc.perform(post("/api/v1/organisations").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Conflict Org " + System.nanoTime() + "\"}"))
                .andExpect(status().isOk()).andReturn();
        String orgId = JsonPath.read(org.getResponse().getContentAsString(), "$.data.id");
        int orgVersion = JsonPath.read(org.getResponse().getContentAsString(), "$.data.version");
        mockMvc.perform(patch("/api/v1/organisations/" + orgId).cookie(employer).header("If-Match", String.valueOf(orgVersion))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"legalName\":\"Renamed once\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/v1/organisations/" + orgId).cookie(employer).header("If-Match", String.valueOf(orgVersion))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"legalName\":\"Renamed twice\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void attachmentsAreManagedByOwnersAndPublicOnceTheListingIsLive() throws Exception {
        Cookie owner = register("EMPLOYER");
        Cookie stranger = register("EMPLOYER");
        String id = submit(owner, "Attachment IT " + System.nanoTime());
        String base = "/api/v1/opportunities/manage/" + id + "/attachments";

        MvcResult added = mockMvc.perform(multipart(base).file(pdf("advert.pdf")).cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fileName").value("advert.pdf"))
                .andReturn();
        String attachmentId = JsonPath.read(added.getResponse().getContentAsString(), "$.data.id");

        // Not yet published: hidden from the public and from other employers, visible to the owner.
        mockMvc.perform(get("/api/v1/opportunities/" + id + "/attachments")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/opportunities/attachments/" + attachmentId + "/download")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/opportunities/" + id + "/attachments").cookie(stranger)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/opportunities/" + id + "/attachments").cookie(owner))
                .andExpect(jsonPath("$.data.length()").value(1));

        // Only people who manage the listing can add or remove documents, and only real files are accepted.
        mockMvc.perform(multipart(base).file(pdf("x.pdf")).cookie(stranger)).andExpect(status().isForbidden());
        mockMvc.perform(multipart(base).file(new MockMultipartFile("file", "fake.pdf", "application/pdf", "<script>".getBytes()))
                        .cookie(owner))
                .andExpect(status().isBadRequest());

        jdbc.update("update opportunities set status = 'PUBLISHED', published_at = now() where id = ?::uuid", id);
        mockMvc.perform(get("/api/v1/opportunities/" + id + "/attachments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].fileName").value("advert.pdf"));
        MvcResult download = mockMvc.perform(get("/api/v1/opportunities/attachments/" + attachmentId + "/download"))
                .andExpect(status().isOk()).andReturn();
        assertThat(download.getResponse().getContentAsByteArray()).isEqualTo(PDF);
        assertThat(download.getResponse().getHeader("Content-Disposition")).startsWith("attachment;");

        // At most five per listing.
        for (int i = 2; i <= 5; i++) {
            mockMvc.perform(multipart(base).file(pdf("doc" + i + ".pdf")).cookie(owner)).andExpect(status().isOk());
        }
        mockMvc.perform(multipart(base).file(pdf("doc6.pdf")).cookie(owner))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("at most 5")));

        mockMvc.perform(delete(base + "/" + attachmentId).cookie(stranger)).andExpect(status().isForbidden());
        mockMvc.perform(delete(base + "/" + attachmentId).cookie(owner)).andExpect(status().isNoContent());
        List<String> names = jdbc.queryForList(
                "select file_name from opportunity_attachments where opportunity_id = ?::uuid", String.class, id);
        assertThat(names).hasSize(4).doesNotContain("advert.pdf");
    }

    @Test
    void listingsWithAPastClosingDateCannotBeSubmittedApprovedOrPublished() throws Exception {
        Cookie employer = register("EMPLOYER");
        String past = java.time.Instant.now().minus(java.time.Duration.ofDays(3)).toString();
        String future = java.time.Instant.now().plus(java.time.Duration.ofDays(10)).toString();
        String body = "{\"title\":\"Deadline IT\",\"categoryCode\":\"JOBS\",\"organisationName\":\"IT Org\",\"description\":\"d\","
                + "\"region\":\"Lusaka\",\"applicationMode\":\"EOZ_HOSTED\",\"deadline\":\"%s\"}";
        mockMvc.perform(post("/api/v1/opportunities").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content(body.formatted(past)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The closing date must be in the future."));
        MvcResult ok = mockMvc.perform(post("/api/v1/opportunities").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content(body.formatted(future)))
                .andExpect(status().isOk()).andReturn();
        String id = JsonPath.read(ok.getResponse().getContentAsString(), "$.data.id");

        mockMvc.perform(patch("/api/v1/opportunities/manage/" + id).cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deadline\":\"" + past + "\"}"))
                .andExpect(status().isBadRequest());

        // It closed while waiting in the moderation queue: staff must extend it before approving.
        jdbc.update("update opportunities set deadline = now() - interval '1 hour' where id = ?::uuid", id);
        mockMvc.perform(patch("/api/v1/opportunities/" + id + "/approve").cookie(login(staff("ADMIN"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("closing date has passed")));
    }

    // ---------------------------------------------------------------- helpers

    private static MockMultipartFile pdf(String name) {
        return new MockMultipartFile("file", name, "application/pdf", PDF);
    }

    private String manage(Cookie cookie, String id) throws Exception {
        return mockMvc.perform(get("/api/v1/opportunities/manage/" + id).cookie(cookie))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private String submit(Cookie employer, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/opportunities").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"categoryCode\":\"JOBS\",\"organisationName\":\"IT Org\","
                                + "\"description\":\"desc\",\"region\":\"Lusaka\",\"applicationMode\":\"EOZ_HOSTED\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private Cookie register(String accountType) throws Exception {
        String email = "it-safeguards-" + accountType.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"IT Safeguards\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                                + "\",\"accountType\":\"" + accountType + "\"}"))
                .andExpect(status().isOk());
        return login(email);
    }

    private String staff(String role) {
        String email = "it-safeguards-" + role.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
        User user = new User();
        user.setFullName("IT " + role);
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
