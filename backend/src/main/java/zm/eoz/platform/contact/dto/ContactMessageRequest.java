package zm.eoz.platform.contact.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ContactMessageRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        String phone,
        @NotBlank String reason,
        @NotBlank String message) {}
