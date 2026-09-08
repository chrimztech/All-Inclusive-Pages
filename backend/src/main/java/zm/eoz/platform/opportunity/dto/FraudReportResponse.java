package zm.eoz.platform.opportunity.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.opportunity.FraudReport;

public record FraudReportResponse(
        UUID id,
        UUID opportunityId,
        String opportunityTitle,
        String listingReference,
        String reason,
        String description,
        String reporterName,
        String reporterEmail,
        String status,
        Instant createdAt) {
    public static FraudReportResponse from(FraudReport r) {
        return new FraudReportResponse(
                r.getId(),
                r.getOpportunity() != null ? r.getOpportunity().getId() : null,
                r.getOpportunity() != null ? r.getOpportunity().getTitle() : null,
                r.getListingReference(),
                r.getReason(),
                r.getDescription(),
                r.getReporterName(),
                r.getReporterEmail(),
                r.getStatus().name(),
                r.getCreatedAt());
    }
}
