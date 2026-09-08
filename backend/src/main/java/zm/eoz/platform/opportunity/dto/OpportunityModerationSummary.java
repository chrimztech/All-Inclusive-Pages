package zm.eoz.platform.opportunity.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.opportunity.Opportunity;

public record OpportunityModerationSummary(
        UUID id,
        String reference,
        String title,
        String categoryName,
        String organisationName,
        String region,
        String status,
        String source,
        String applicationMode,
        String createdByName,
        String flaggedDuplicateOfReference,
        Instant createdAt) {

    public static OpportunityModerationSummary from(Opportunity o) {
        return new OpportunityModerationSummary(
                o.getId(),
                o.getReference(),
                o.getTitle(),
                o.getCategory().getName(),
                o.getOrganisationName(),
                o.getRegion(),
                o.getStatus().name(),
                o.getSource(),
                o.getApplicationMode().name(),
                o.getCreatedBy() != null ? o.getCreatedBy().getFullName() : null,
                o.getFlaggedDuplicateOf() != null ? o.getFlaggedDuplicateOf().getReference() : null,
                o.getCreatedAt());
    }
}
