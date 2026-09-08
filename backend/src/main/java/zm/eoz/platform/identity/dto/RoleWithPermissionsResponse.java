package zm.eoz.platform.identity.dto;

import java.util.List;
import zm.eoz.platform.identity.Role;

public record RoleWithPermissionsResponse(String name, String description, List<String> permissionCodes) {
    public static RoleWithPermissionsResponse from(Role r) {
        return new RoleWithPermissionsResponse(
                r.getName(),
                r.getDescription(),
                r.getPermissions().stream().map(zm.eoz.platform.identity.Permission::getCode).sorted().toList());
    }
}
