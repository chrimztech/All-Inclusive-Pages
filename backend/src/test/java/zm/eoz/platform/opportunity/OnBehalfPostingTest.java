package zm.eoz.platform.opportunity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
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
import org.springframework.test.web.servlet.ResultActions;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/** EOZ staff post listings on behalf of registered (or unregistered) organisations. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OnBehalfPostingTest {

    private static final String PASSWORD = "Password123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void anAdministratorPublishesForAnOrganisationWhoseTeamThenOwnsTheListing() throws Exception {
        String ownerEmail = "it-behalf-owner-" + System.nanoTime() + "@example.zm";
        Cookie owner = register("EMPLOYER", ownerEmail);
        String orgName = "Behalf Org " + System.nanoTime();
        String orgId = organisation(owner, orgName);
        Cookie admin = login(staff("ADMIN"));

        // The picker finds it.
        mockMvc.perform(get("/api/v1/opportunities/post-for/organisations").param("q", orgName).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(orgId));

        MvcResult created = submit(admin, orgId, true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.organisationId").value(orgId))
                .andExpect(jsonPath("$.data.organisationName").value(orgName))
                .andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        // The organisation is told, can see it in My listings, and can manage it.
        assertThat(jdbc.queryForObject("select count(*) from notifications n join users u on u.id = n.user_id"
                        + " where u.email = ? and n.type = 'OPPORTUNITY_POSTED_FOR_YOU'", Long.class, ownerEmail))
                .isEqualTo(1);
        mockMvc.perform(get("/api/v1/opportunities/mine").cookie(owner))
                .andExpect(jsonPath("$.data.items[*].id").value(org.hamcrest.Matchers.hasItem(id)));
        mockMvc.perform(patch("/api/v1/opportunities/manage/" + id).cookie(owner).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"Updated by the organisation\"}"))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select summary from audit_events where entity_id = (select reference from opportunities"
                        + " where id = ?::uuid) and action = 'PUBLISHED'", String.class, id))
                .contains("on behalf of \"" + orgName + "\"");
    }

    @Test
    void anAdministratorCreatesACompanyAndImmediatelyPostsForIt() throws Exception {
        Cookie admin = login(staff("ADMIN"));
        String orgName = "Admin Created Company " + System.nanoTime();

        MvcResult organisation = mockMvc.perform(post("/api/v1/organisations").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"" + orgName + "\",\"businessType\":\"LIMITED_COMPANY\","
                                + "\"sector\":\"Technology\",\"contactPersonName\":\"Jane Contact\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.legalName").value(orgName))
                .andExpect(jsonPath("$.data.verificationStatus").value("PENDING"))
                .andReturn();
        String orgId = JsonPath.read(organisation.getResponse().getContentAsString(), "$.data.id");

        // Creating a directory record on behalf of a company must not make the EOZ administrator its owner.
        assertThat(jdbc.queryForObject(
                        "select count(*) from organisation_members where organisation_id = ?::uuid", Long.class, orgId))
                .isZero();

        mockMvc.perform(get("/api/v1/opportunities/post-for/organisations").param("q", orgName).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(orgId));

        submit(admin, orgId, true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.organisationId").value(orgId))
                .andExpect(jsonPath("$.data.organisationName").value(orgName));
    }

    @Test
    void staffWithoutPublishRightsSubmitForReviewInstead() throws Exception {
        String orgId = organisation(register("EMPLOYER", null), "Review Org " + System.nanoTime());
        Cookie content = login(staff("CONTENT_OFFICER"));
        submit(content, orgId, true).andExpect(status().isForbidden());
        submit(content, orgId, false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.data.organisationId").value(orgId));
    }

    @Test
    void employersCanOnlyPostForTheirOwnOrganisationAndNobodyForASuspendedOne() throws Exception {
        String otherOrg = organisation(register("EMPLOYER", null), "Other Org " + System.nanoTime());
        submit(register("EMPLOYER", null), otherOrg, false).andExpect(status().isForbidden());

        jdbc.update("update organisations set verification_status = 'SUSPENDED' where id = ?::uuid", otherOrg);
        submit(login(staff("ADMIN")), otherOrg, false)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("suspended")));

        mockMvc.perform(get("/api/v1/opportunities/post-for/organisations").cookie(register("EMPLOYER", null)))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffCanStillPostForAnOrganisationThatIsNotRegistered() throws Exception {
        Cookie admin = login(staff("ADMIN"));
        mockMvc.perform(post("/api/v1/opportunities").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content(body("Ministry of Agriculture (not on EOZ)", null, false)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.organisationId").doesNotExist())
                .andExpect(jsonPath("$.data.organisationName").value("Ministry of Agriculture (not on EOZ)"));
    }

    @Test
    void anUnregisteredOrganisationIsPublishedAsUnverifiedAndNotLinkedToTheStaffMembersOwnOrganisation() throws Exception {
        String adminEmail = staff("ADMIN");
        Cookie admin = login(adminEmail);
        // The admin also belongs to an organisation of their own.
        organisation(admin, "Admin's Own Org " + System.nanoTime());

        MvcResult created = mockMvc.perform(post("/api/v1/opportunities").cookie(admin).contentType(MediaType.APPLICATION_JSON)
                        .content(body("Lusaka Water Trust (not on EOZ)", null, true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.organisationId").doesNotExist())
                .andExpect(jsonPath("$.data.organisationName").value("Lusaka Water Trust (not on EOZ)"))
                .andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");
        assertThat(jdbc.queryForObject("select verified from opportunities where id = ?::uuid", Boolean.class, id))
                .isFalse();
    }

    @Test
    void staffCanAddAMissingOrganisationAsUnverifiedWhilePostingAndItIsReusedNextTime() throws Exception {
        String name = "Kafue Fisheries Co-op " + System.nanoTime();
        Cookie admin = login(staff("ADMIN"));

        MvcResult first = addAndPost(admin, name, true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.organisationId").exists())
                .andExpect(jsonPath("$.data.organisationName").value(name))
                .andReturn();
        String orgId = JsonPath.read(first.getResponse().getContentAsString(), "$.data.organisationId");
        String listingId = JsonPath.read(first.getResponse().getContentAsString(), "$.data.id");
        assertThat(jdbc.queryForObject("select verification_status from organisations where id = ?::uuid", String.class, orgId))
                .isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("select count(*) from organisation_members where organisation_id = ?::uuid", Long.class, orgId))
                .isZero();
        assertThat(jdbc.queryForObject("select verified from opportunities where id = ?::uuid", Boolean.class, listingId))
                .isFalse();

        // A content officer posting for the same organisation (any capitalisation) reuses the record.
        addAndPost(login(staff("CONTENT_OFFICER")), "  " + name.toUpperCase() + " ", false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.organisationId").value(orgId));
        assertThat(jdbc.queryForObject("select count(*) from organisations where lower(legal_name) = lower(?)", Long.class, name))
                .isEqualTo(1);
    }

    @Test
    void employersCannotAddOrganisationsThroughTheListingForm() throws Exception {
        String name = "Employer-added Org " + System.nanoTime();
        addAndPost(register("EMPLOYER", null), name, false).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from organisations where legal_name = ?", Long.class, name))
                .isZero();
    }

    // ---------------------------------------------------------------- helpers

    private ResultActions addAndPost(Cookie cookie, String organisationName, boolean publishNow) throws Exception {
        String json = body(organisationName, null, publishNow);
        return mockMvc.perform(post("/api/v1/opportunities").cookie(cookie).contentType(MediaType.APPLICATION_JSON)
                .content(json.substring(0, json.length() - 1) + ",\"addOrganisation\":true}"));
    }

    private ResultActions submit(Cookie cookie, String organisationId, boolean publishNow) throws Exception {
        return mockMvc.perform(post("/api/v1/opportunities").cookie(cookie).contentType(MediaType.APPLICATION_JSON)
                .content(body("ignored when an organisation is chosen", organisationId, publishNow)));
    }

    private static String body(String organisationName, String organisationId, boolean publishNow) {
        return "{\"title\":\"On-behalf IT " + System.nanoTime() + "\",\"categoryCode\":\"JOBS\",\"organisationName\":\""
                + organisationName + "\",\"description\":\"Official advert received by email.\",\"region\":\"Lusaka\","
                + "\"applicationMode\":\"EMPLOYER_EMAIL\",\"applicationEmail\":\"hr@example.zm\","
                + "\"deadline\":\"" + java.time.Instant.now().plus(java.time.Duration.ofDays(14)) + "\""
                + (organisationId != null ? ",\"organisationId\":\"" + organisationId + "\"" : "")
                + ",\"publishNow\":" + publishNow + "}";
    }

    private String organisation(Cookie employer, String name) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/v1/organisations").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"" + name + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.id");
    }

    private Cookie register(String accountType, String email) throws Exception {
        String address = email != null ? email : "it-behalf-" + accountType.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"IT Behalf\",\"email\":\"" + address + "\",\"password\":\"" + PASSWORD
                                + "\",\"accountType\":\"" + accountType + "\"}"))
                .andExpect(status().isOk());
        return login(address);
    }

    private String staff(String role) {
        String email = "it-behalf-" + role.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
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
