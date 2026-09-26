package zm.eoz.platform.opportunity.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.opportunity.Opportunity;

public record EmployerOpportunitySummary(
        UUID id,
        String reference,
        String slug,
        String title,
        String categoryName,
        String organisationName,
        String region,
        String workMode,
        String applicationMode,
        String status,
        boolean verified,
        long viewsCount,
        long savesCount,
        long applyClicks,
        long shareCount,
        boolean featured,
        Instant deadline,
        Instant publishedAt,
        Instant createdAt) {

    public static EmployerOpportunitySummary from(Opportunity o, long savesCount) {
        return new EmployerOpportunitySummary(
                o.getId(),
                o.getReference(),
                o.getSlug(),
                o.getTitle(),
                o.getCategory().getName(),
                o.getOrganisationName(),
                o.getRegion(),
                o.getWorkMode(),
                o.getApplicationMode().name(),
                o.getStatus().name(),
                o.isVerified(),
                o.getViewsCount(),
                savesCount,
                o.getApplyClicks(),
                o.getShareCount(),
                o.isFeatured(),
                o.getDeadline(),
                o.getPublishedAt(),
                o.getCreatedAt());
    }
}
