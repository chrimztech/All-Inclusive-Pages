package zm.eoz.platform.opportunity.dto;

import java.util.List;

public record EmployerAnalyticsSummary(
        long listingsCount,
        long totalViews,
        long totalSaves,
        List<TopListing> topListings,
        List<CategoryCount> categoryMix) {

    public record TopListing(String title, String slug, long viewsCount) {}

    public record CategoryCount(String categoryName, long count) {}
}
