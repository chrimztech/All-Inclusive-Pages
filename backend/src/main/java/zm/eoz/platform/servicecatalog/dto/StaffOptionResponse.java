package zm.eoz.platform.servicecatalog.dto;

import java.util.List;
import java.util.UUID;
import zm.eoz.platform.identity.Role;
import zm.eoz.platform.identity.User;

public record StaffOptionResponse(UUID id, String fullName, String email, List<String> roles) {
    public static StaffOptionResponse from(User u) {
        return new StaffOptionResponse(
                u.getId(), u.getFullName(), u.getEmail(), u.getRoles().stream().map(Role::getName).toList());
    }
}
