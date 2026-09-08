package zm.eoz.platform.opportunity.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.opportunity.Opportunity;

public record OpportunitySummaryResponse(
        UUID id,
        String reference,
        String slug,
        String title,
        String categoryCode,
        String categoryName,
        String organisationName,
        String location,
        String region,
        String workMode,
        boolean verified,
        String opportunityValue,
        String opportunityValueUnit,
        Instant deadline,
        Instant publishedAt) {

    public static OpportunitySummaryResponse from(Opportunity o) {
        return new OpportunitySummaryResponse(
                o.getId(),
                o.getReference(),
                o.getSlug(),
                o.getTitle(),
                o.getCategory().getCode(),
                o.getCategory().getName(),
                o.getOrganisationName(),
                o.getLocation(),
                o.getRegion(),
                o.getWorkMode(),
                o.isVerified(),
                o.getOpportunityValue(),
                o.getOpportunityValueUnit(),
                o.getDeadline(),
                o.getPublishedAt());
    }
}
