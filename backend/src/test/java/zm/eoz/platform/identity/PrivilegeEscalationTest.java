package zm.eoz.platform.identity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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

/**
 * Someone trusted with user management but not an administrator can't escalate: they can't create or take over
 * administrators, grant roles beyond their own permissions, or change their own access. Admins can't lock
 * themselves out, and candidate/employer roles can't be turned into staff roles.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PrivilegeEscalationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    /** For these tests the AUDITOR role is also trusted with USER_MANAGE (a delegated user manager). */
    @BeforeEach
    void delegateUserManagement() {
        jdbc.update("insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r, permissions p"
                + " where r.name = 'AUDITOR' and p.code = 'USER_MANAGE' on conflict do nothing");
    }

    @AfterEach
    void undoDelegation() {
        jdbc.update("delete from role_permissions where role_id = (select id from roles where name = 'AUDITOR')"
                + " and permission_id = (select id from permissions where code = 'USER_MANAGE')");
    }

    @Test
    void aDelegatedUserManagerCannotCreateOrTakeOverAdministrators() throws Exception {
        String delegateEmail = staff("AUDITOR");
        Cookie delegate = login(delegateEmail);
        UUID admin = userId(staff("ADMIN"));
        UUID candidate = userId(staff("CANDIDATE"));

        roles(delegate, candidate, "ADMIN").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("Only an administrator")));
        roles(delegate, userId(delegateEmail), "ADMIN").andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/admin/users").cookie(delegate).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"New Admin\",\"email\":\"it-esc-new-" + System.nanoTime()
                                + "@example.zm\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
        // No taking over an admin by resetting their password, renaming or suspending them.
        mockMvc.perform(post("/api/v1/admin/users/" + admin + "/reset-password").cookie(delegate)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/admin/users/" + admin + "/status").cookie(delegate)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"SUSPENDED\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/admin/users/" + admin).cookie(delegate)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\"Hijacked\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rolesCanOnlyBeGrantedWithinTheGrantersOwnPermissions() throws Exception {
        Cookie delegate = login(staff("AUDITOR"));
        UUID candidate = userId(staff("CANDIDATE"));
        // FINANCE_OFFICER carries FINANCE_MANAGE and SERVICE_VIEW, which the delegate doesn't hold.
        roles(delegate, candidate, "FINANCE_OFFICER").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("FINANCE_MANAGE")));
        // Nor can they strip a role above their authority.
        UUID finance = userId(staff("FINANCE_OFFICER"));
        roles(delegate, finance, "CANDIDATE").andExpect(status().isForbidden());
        // Within their authority it works.
        roles(delegate, candidate, "AUDITOR").andExpect(status().isOk());
        roles(delegate, candidate).andExpect(status().isBadRequest());
        // The Users page is told exactly which roles this person may hand out.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/admin/users/grantable-roles").cookie(delegate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.contains("AUDITOR", "CANDIDATE", "EMPLOYER")));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/admin/users/grantable-roles").cookie(login(staff("ADMIN"))))
                .andExpect(jsonPath("$.data.length()").value(9));
    }

    @Test
    void administratorsCannotChangeTheirOwnAccessOrMakeSignUpsStaff() throws Exception {
        String adminEmail = staff("ADMIN");
        Cookie admin = login(adminEmail);
        UUID self = userId(adminEmail);
        roles(admin, self, "CANDIDATE").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("your own roles")));
        mockMvc.perform(patch("/api/v1/admin/users/" + self + "/status").cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DEACTIVATED\"}"))
                .andExpect(status().isBadRequest());
        // Admins can still manage other admins.
        UUID otherAdmin = userId(staff("ADMIN"));
        roles(admin, otherAdmin, "MANAGER").andExpect(status().isOk());

        for (String signUpRole : new String[] {"CANDIDATE", "EMPLOYER"}) {
            mockMvc.perform(put("/api/v1/admin/roles/" + signUpRole + "/permissions").cookie(admin)
                            .contentType(MediaType.APPLICATION_JSON).content("{\"permissionCodes\":[\"AUDIT_READ\"]}"))
                    .andExpect(status().isBadRequest());
        }
    }

    // ---------------------------------------------------------------- helpers

    private org.springframework.test.web.servlet.ResultActions roles(Cookie actor, UUID target, String... roles) throws Exception {
        String list = String.join(",", java.util.Arrays.stream(roles).map(r -> "\"" + r + "\"").toList());
        return mockMvc.perform(patch("/api/v1/admin/users/" + target + "/roles").cookie(actor)
                .contentType(MediaType.APPLICATION_JSON).content("{\"roles\":[" + list + "]}"));
    }

    private UUID userId(String email) {
        return userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
    }

    private String staff(String role) {
        String email = "it-esc-" + role.toLowerCase() + "-" + System.nanoTime() + "@example.zm";
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
