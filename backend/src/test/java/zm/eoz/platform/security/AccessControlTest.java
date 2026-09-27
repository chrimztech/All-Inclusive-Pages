package zm.eoz.platform.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import zm.eoz.platform.identity.RoleRepository;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;

/** Least privilege on the server: access follows permissions, and nobody can file or read someone else's files. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccessControlTest {

    private static final String PASSWORD = "Password123!";
    private static final byte[] PDF = "%PDF-1.7 cv".getBytes();

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void candidateDocumentsAreReadableOnlyByTheirOwnerAndRecruitmentStaff() throws Exception {
        Cookie owner = register("CANDIDATE");
        String fileId = uploadCv(owner);

        mockMvc.perform(get("/api/v1/files/" + fileId + "/download").cookie(owner)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/files/" + fileId + "/download").cookie(login(staff("RECRUITMENT_OFFICER"))))
                .andExpect(status().isOk());
        // Being staff is not enough: finance and content staff have no reason to read CVs.
        for (String role : new String[] {"FINANCE_OFFICER", "CONTENT_OFFICER", "AUDITOR", "SERVICE_OFFICER"}) {
            mockMvc.perform(get("/api/v1/files/" + fileId + "/download").cookie(login(staff(role))))
                    .andExpect(status().isForbidden());
        }
        mockMvc.perform(get("/api/v1/files/" + fileId + "/download").cookie(register("CANDIDATE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void theGenericUploadCannotFileDocumentsUnderSomeoneElsesRecord() throws Exception {
        Cookie attacker = register("EMPLOYER");
        Cookie victim = register("EMPLOYER");
        String victimOrg = organisation(victim);

        // Verification evidence can only be added through the organisation's own (member-checked) endpoint.
        mockMvc.perform(multipart("/api/v1/files").file(pdf()).param("ownerType", "ORGANISATION_VERIFICATION")
                        .param("ownerId", victimOrg).cookie(attacker))
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select count(*) from file_assets where owner_id = ?", Long.class, victimOrg)).isZero();

        // A logo can only be uploaded for your own organisation.
        mockMvc.perform(multipart("/api/v1/files").file(png()).param("ownerType", "ORGANISATION_LOGO")
                        .param("ownerId", victimOrg).cookie(attacker))
                .andExpect(status().isForbidden());

        // Personal documents are always filed under the uploader, whatever owner the browser claims.
        MvcResult upload = mockMvc.perform(multipart("/api/v1/files").file(pdf()).param("ownerType", "CANDIDATE_DOCUMENT")
                        .param("ownerId", "00000000-0000-0000-0000-000000000001").cookie(attacker))
                .andExpect(status().isOk()).andReturn();
        String id = JsonPath.read(upload.getResponse().getContentAsString(), "$.data.id");
        String attackerId = me(attacker);
        assertThat(jdbc.queryForObject("select owner_id from file_assets where id = ?::uuid", String.class, id)).isEqualTo(attackerId);
    }

    @Test
    void peopleCanOnlyUseFilesTheyUploadedAsTheirPhotoCvOrLogo() throws Exception {
        Cookie victim = register("CANDIDATE");
        String victimCv = uploadCv(victim);
        Cookie other = register("CANDIDATE");
        mockMvc.perform(patch("/api/v1/candidate/profile/resume").cookie(other).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileId\":\"" + victimCv + "\"}"))
                .andExpect(status().isForbidden());
        // Their own CV works; a PDF can't be a photo.
        String ownCv = uploadCv(other);
        mockMvc.perform(patch("/api/v1/candidate/profile/resume").cookie(other).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileId\":\"" + ownCv + "\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/v1/candidate/profile/photo").cookie(other).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileId\":\"" + ownCv + "\"}"))
                .andExpect(status().isBadRequest());

        Cookie employer = register("EMPLOYER");
        String org = organisation(employer);
        mockMvc.perform(patch("/api/v1/organisations/" + org + "/logo").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileId\":\"" + victimCv + "\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void applicantsFollowTheApplicationPermissionNotStaffStatus() throws Exception {
        Cookie employer = register("EMPLOYER");
        MvcResult created = mockMvc.perform(post("/api/v1/opportunities").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Access IT\",\"categoryCode\":\"JOBS\",\"organisationName\":\"IT Org\","
                                + "\"description\":\"d\",\"region\":\"Lusaka\",\"applicationMode\":\"EOZ_HOSTED\"}"))
                .andExpect(status().isOk()).andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        mockMvc.perform(get("/api/v1/opportunities/" + id + "/applications").cookie(employer)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/opportunities/" + id + "/applications").cookie(login(staff("RECRUITMENT_OFFICER"))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/opportunities/" + id + "/applications").cookie(login(staff("FINANCE_OFFICER"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/opportunities/" + id + "/applications").cookie(register("EMPLOYER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void meReportsTeamMembershipSoInvitedMembersGetTheEmployerPortal() throws Exception {
        Cookie owner = register("EMPLOYER");
        String org = organisation(owner);
        String email = "it-access-member-" + System.nanoTime() + "@example.zm";
        Cookie member = registerAs("CANDIDATE", email);
        mockMvc.perform(get("/api/v1/auth/me").cookie(member)).andExpect(jsonPath("$.data.organisationMember").value(false));
        mockMvc.perform(post("/api/v1/organisations/" + org + "/members").cookie(owner).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auth/me").cookie(member)).andExpect(jsonPath("$.data.organisationMember").value(true));
    }

    // ---------------------------------------------------------------- helpers

    private static MockMultipartFile pdf() {
        return new MockMultipartFile("file", "cv.pdf", "application/pdf", PDF);
    }

    private static MockMultipartFile png() {
        return new MockMultipartFile("file", "logo.png", "image/png",
                new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0});
    }

    private String uploadCv(Cookie candidate) throws Exception {
        MvcResult r = mockMvc.perform(multipart("/api/v1/files").file(pdf()).param("ownerType", "CANDIDATE_DOCUMENT")
                        .param("ownerId", me(candidate)).cookie(candidate))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.id");
    }

    private String organisation(Cookie employer) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/v1/organisations").cookie(employer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"legalName\":\"Access Org " + System.nanoTime() + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.id");
    }

    private String me(Cookie cookie) throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.id");
    }

    private Cookie register(String accountType) throws Exception {
        return registerAs(accountType, "it-access-" + accountType.toLowerCase() + "-" + System.nanoTime() + "@example.zm");
    }

    private Cookie registerAs(String accountType, String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"IT Access\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                                + "\",\"accountType\":\"" + accountType + "\"}"))
                .andExpect(status().isOk());
        return login(email);
    }

    private String staff(String role) {
        String email = "it-access-" + role.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
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
