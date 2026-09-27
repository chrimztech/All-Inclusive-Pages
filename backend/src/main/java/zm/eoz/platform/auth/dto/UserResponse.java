package zm.eoz.platform.auth.dto;

import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String fullName,
        String email,
        String phone,
        boolean emailVerified,
        List<String> roles,
        boolean opportunityAlertsEnabled,
        boolean serviceCommsEnabled,
        boolean mustChangePassword,
        boolean mfaEnabled,
        List<String> permissions,
        /** Belongs to at least one organisation (team members may hold the candidate role). */
        boolean organisationMember) {

    /**
     * The web app uses {@code permissions} only to hide screens a person cannot use; every endpoint still
     * enforces them on the server.
     */
    public static UserResponse from(zm.eoz.platform.identity.User user) {
        return from(user, false);
    }

    public static UserResponse from(zm.eoz.platform.identity.User user, boolean organisationMember) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.isEmailVerified(),
                user.getRoles().stream().map(zm.eoz.platform.identity.Role::getName).sorted().toList(),
                user.isOpportunityAlertsEnabled(),
                user.isServiceCommsEnabled(),
                user.isMustChangePassword(),
                user.isMfaEnabled(),
                user.getRoles().stream()
                        .flatMap(r -> r.getPermissions().stream())
                        .map(zm.eoz.platform.identity.Permission::getCode)
                        .distinct()
                        .sorted()
                        .toList(),
                organisationMember);
    }
}
