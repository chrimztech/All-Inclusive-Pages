package zm.eoz.platform.opportunity.dto;

import jakarta.validation.constraints.NotBlank;

public record FraudReportRequest(
        String listingReference, @NotBlank String reason, String description, String reporterName, String reporterEmail) {}
