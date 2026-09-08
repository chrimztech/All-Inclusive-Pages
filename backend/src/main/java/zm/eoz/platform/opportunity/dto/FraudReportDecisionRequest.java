package zm.eoz.platform.opportunity.dto;

import jakarta.validation.constraints.NotBlank;

public record FraudReportDecisionRequest(@NotBlank String status) {}
