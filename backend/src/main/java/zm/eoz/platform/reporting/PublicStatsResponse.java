package zm.eoz.platform.reporting;

public record PublicStatsResponse(
        long verifiedOrganisations, long publishedListings, long applicationsThisWeek, Double averageReviewHours) {}
