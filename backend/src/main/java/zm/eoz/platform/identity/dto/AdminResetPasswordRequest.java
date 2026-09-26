package zm.eoz.platform.identity.dto;

import jakarta.validation.constraints.Size;

/** newPassword is optional: when omitted the server generates a one-time password. */
public record AdminResetPasswordRequest(@Size(min = 8, max = 128) String newPassword) {}
