package zm.eoz.platform.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 128) String password,
        @NotBlank @Pattern(regexp = "CANDIDATE|EMPLOYER", message = "accountType must be CANDIDATE or EMPLOYER")
                String accountType,
        @Pattern(regexp = "^[0-9+() .-]{6,32}$", message = "Enter a valid phone number")
                String phone,
        // CANDIDATE-only, all optional:
        String location,
        String headline,
        String skills,
        String availability,
        // EMPLOYER-only: providing organisationName registers the organisation and makes the new user its owner.
        String organisationName,
        String organisationSector,
        String organisationRegistrationNumber,
        String organisationWebsite,
        String organisationBusinessType,
        String organisationSizeBand) {}
