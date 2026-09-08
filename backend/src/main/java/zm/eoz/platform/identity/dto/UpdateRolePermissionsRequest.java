package zm.eoz.platform.identity.dto;

import java.util.List;

public record UpdateRolePermissionsRequest(List<String> permissionCodes) {}
