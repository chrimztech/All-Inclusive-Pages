package zm.eoz.platform.identity.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import zm.eoz.platform.identity.Role;
import zm.eoz.platform.identity.User;

public record UserAdminResponse(
        UUID id, String fullName, String email, String phone, String status, boolean emailVerified, List<String> roles, Instant createdAt,
        boolean mustChangePassword, String temporaryPassword) {
    public static UserAdminResponse from(User u) {
        return new UserAdminResponse(
                u.getId(),
                u.getFullName(),
                u.getEmail(),
                u.getPhone(),
                u.getStatus().name(),
                u.isEmailVerified(),
                u.getRoles().stream().map(Role::getName).toList(),
                u.getCreatedAt(),
                u.isMustChangePassword(),
                null);
    }

    /** Only ever returned once, in the response to creating an account or resetting its password. */
    public UserAdminResponse withTemporaryPassword(String password) {
        return new UserAdminResponse(
                id, fullName, email, phone, status, emailVerified, roles, createdAt, mustChangePassword, password);
    }
}
