package zm.eoz.platform.identity.dto;

import zm.eoz.platform.identity.Permission;

public record PermissionResponse(String code, String description) {
    public static PermissionResponse from(Permission p) {
        return new PermissionResponse(p.getCode(), p.getDescription());
    }
}
