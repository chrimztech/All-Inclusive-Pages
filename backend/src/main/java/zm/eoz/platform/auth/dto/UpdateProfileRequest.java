package zm.eoz.platform.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 255) String fullName,
        @Pattern(regexp = "^$|^[0-9+() .-]{6,32}$", message = "Enter a valid phone number") String phone) {}
