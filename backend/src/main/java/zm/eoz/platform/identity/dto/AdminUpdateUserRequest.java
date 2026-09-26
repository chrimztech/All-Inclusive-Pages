package zm.eoz.platform.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminUpdateUserRequest(@NotBlank String fullName, String phone) {}
