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
        boolean serviceCommsEnabled) {}
