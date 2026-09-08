package zm.eoz.platform.reporting;

import java.util.List;

public record ReportOverviewResponse(
        long publishedOpportunities,
        long pendingReview,
        long archivedOrRejected,
        List<NameCount> categoryMix,
        List<NameCount> regionMix,
        List<NameCount> applicationsByStatus,
        List<NameCount> serviceOrdersByStatus,
        long unpaidInvoices,
        long paidInvoices,
        long unresolvedFraudReports) {}
