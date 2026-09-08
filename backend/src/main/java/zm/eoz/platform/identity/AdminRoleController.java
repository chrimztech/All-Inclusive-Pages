package zm.eoz.platform.identity;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.identity.dto.PermissionResponse;
import zm.eoz.platform.identity.dto.RoleWithPermissionsResponse;
import zm.eoz.platform.identity.dto.UpdateRolePermissionsRequest;
import zm.eoz.platform.security.UserPrincipal;

/**
 * Meta-level access control: who can shape what each staff role is permitted to do.
 * Deliberately gated by role, not by a permission itself, to avoid a circular dependency
 * where changing permissions requires a permission that could itself be revoked.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRoleController {

    private final RoleAdminService roleAdminService;
    private final UserRepository userRepository;

    public AdminRoleController(RoleAdminService roleAdminService, UserRepository userRepository) {
        this.roleAdminService = roleAdminService;
        this.userRepository = userRepository;
    }

    @GetMapping("/permissions")
    public ApiResponse<List<PermissionResponse>> listPermissions() {
        return ApiResponse.of(roleAdminService.listPermissions());
    }

    @GetMapping("/roles")
    public ApiResponse<List<RoleWithPermissionsResponse>> listRoles() {
        return ApiResponse.of(roleAdminService.listRoles());
    }

    @PutMapping("/roles/{roleName}/permissions")
    public ApiResponse<RoleWithPermissionsResponse> updateRolePermissions(
            @PathVariable String roleName, @Valid @RequestBody UpdateRolePermissionsRequest request) {
        return ApiResponse.of(roleAdminService.updateRolePermissions(roleName, request.permissionCodes(), currentUser()));
    }

    private User currentUser() {
        var principal = (UserPrincipal)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
