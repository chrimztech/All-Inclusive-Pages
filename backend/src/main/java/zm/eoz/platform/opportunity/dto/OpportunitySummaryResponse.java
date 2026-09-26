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
        String employmentType,
        String workArrangement,
        String experienceLevel,
        boolean verified,
        String opportunityValue,
        String opportunityValueUnit,
        java.math.BigDecimal salaryMin,
        java.math.BigDecimal salaryMax,
        String currency,
        Instant deadline,
        Instant publishedAt,
        long viewsCount,
        boolean featured) {

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
                o.getEmploymentType() != null ? o.getEmploymentType().name() : null,
                o.getWorkArrangement() != null ? o.getWorkArrangement().name() : null,
                o.getExperienceLevel() != null ? o.getExperienceLevel().name() : null,
                o.isVerified(),
                o.getOpportunityValue(),
                o.getOpportunityValueUnit(),
                o.getSalaryMin(),
                o.getSalaryMax(),
                o.getCurrency(),
                o.getDeadline(),
                o.getPublishedAt(),
                o.getViewsCount(),
                o.isFeatured());
    }
}
