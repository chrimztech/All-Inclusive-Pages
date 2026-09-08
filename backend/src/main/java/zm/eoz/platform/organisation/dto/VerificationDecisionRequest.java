package zm.eoz.platform.organisation.dto;

import jakarta.validation.constraints.NotNull;

public record VerificationDecisionRequest(@NotNull String decision, String notes) {}
