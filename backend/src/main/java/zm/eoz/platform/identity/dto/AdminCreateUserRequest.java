package zm.eoz.platform.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminCreateUserRequest(
        @NotBlank String fullName,
        @NotBlank @Email String email,
        String phone,
        @Size(min = 8) String password,
        @NotBlank String role) {}
