package zm.eoz.platform.identity;

import java.util.HashSet;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.dto.PermissionResponse;
import zm.eoz.platform.identity.dto.RoleWithPermissionsResponse;

@Service
public class RoleAdminService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuditService auditService;

    public RoleAdminService(
            RoleRepository roleRepository, PermissionRepository permissionRepository, AuditService auditService) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> listPermissions() {
        return permissionRepository.findAllByOrderByCodeAsc().stream().map(PermissionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<RoleWithPermissionsResponse> listRoles() {
        return roleRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(Role::getName))
                .map(RoleWithPermissionsResponse::from)
                .toList();
    }

    /**
     * ADMIN's permission set is intentionally immutable — it always holds every permission,
     * including ones added later. Without this guardrail, an operator could accidentally
     * strip ADMIN's own access (e.g. USER_MANAGE) and lock every administrator out of the
     * one screen that could undo it.
     */
    @Transactional
    public RoleWithPermissionsResponse updateRolePermissions(String roleName, List<String> permissionCodes, User actor) {
        if ("ADMIN".equals(roleName)) {
            throw new BadRequestException("The ADMIN role's permissions cannot be changed — it always has full access.");
        }
        Role role = roleRepository
                .findByName(roleName)
                .orElseThrow(() -> new NotFoundException("Role not found: " + roleName));

        var permissions = new HashSet<Permission>();
        for (String code : permissionCodes) {
            Permission permission = permissionRepository
                    .findByCode(code)
                    .orElseThrow(() -> new BadRequestException("Unknown permission code: " + code));
            permissions.add(permission);
        }
        role.setPermissions(permissions);
        roleRepository.save(role);

        auditService.record(
                actor,
                "ROLE_PERMISSIONS_UPDATED",
                "Role",
                roleName,
                "Set permissions to [" + String.join(", ", permissionCodes) + "]");
        return RoleWithPermissionsResponse.from(role);
    }
}
