package zm.eoz.platform.reporting;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.application.CandidateApplicationRepository;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.opportunity.FraudReport;
import zm.eoz.platform.opportunity.FraudReportRepository;
import zm.eoz.platform.opportunity.OpportunityRepository;
import zm.eoz.platform.opportunity.OpportunityStatus;
import zm.eoz.platform.servicecatalog.InvoiceRepository;
import zm.eoz.platform.servicecatalog.InvoiceStatus;
import zm.eoz.platform.servicecatalog.ServiceOrderRepository;

@RestController
@RequestMapping("/api/v1/admin/reports")
@PreAuthorize("hasAuthority('REPORTS_VIEW')")
public class AdminReportsController {

    private final OpportunityRepository opportunityRepository;
    private final CandidateApplicationRepository applicationRepository;
    private final ServiceOrderRepository serviceOrderRepository;
    private final InvoiceRepository invoiceRepository;
    private final FraudReportRepository fraudReportRepository;
    private final MetricsService metricsService;

    public AdminReportsController(
            OpportunityRepository opportunityRepository,
            CandidateApplicationRepository applicationRepository,
            ServiceOrderRepository serviceOrderRepository,
            InvoiceRepository invoiceRepository,
            FraudReportRepository fraudReportRepository,
            MetricsService metricsService) {
        this.opportunityRepository = opportunityRepository;
        this.applicationRepository = applicationRepository;
        this.serviceOrderRepository = serviceOrderRepository;
        this.invoiceRepository = invoiceRepository;
        this.fraudReportRepository = fraudReportRepository;
        this.metricsService = metricsService;
    }

    @GetMapping("/overview")
    @Transactional(readOnly = true)
    public ApiResponse<ReportOverviewResponse> overview() {
        return ApiResponse.of(new ReportOverviewResponse(
                opportunityRepository.countByStatus(OpportunityStatus.PUBLISHED),
                opportunityRepository.countByStatus(OpportunityStatus.PENDING_REVIEW),
                opportunityRepository.countByStatus(OpportunityStatus.ARCHIVED),
                toNameCounts(opportunityRepository.categoryMixRaw()),
                toNameCounts(opportunityRepository.regionMixRaw()),
                toNameCounts(applicationRepository.statusMixRaw()),
                toNameCounts(serviceOrderRepository.statusMixRaw()),
                invoiceRepository.countByStatus(InvoiceStatus.UNPAID),
                invoiceRepository.countByStatus(InvoiceStatus.PAID),
                fraudReportRepository.countByStatus(FraudReport.Status.OPEN)));
    }

    /** Defined metrics for a window of whole Lusaka days; defaults to the last 30 days. */
    @GetMapping("/metrics")
    public ApiResponse<MetricsService.Report> metrics(
            @RequestParam(required = false) java.time.LocalDate from, @RequestParam(required = false) java.time.LocalDate to) {
        java.time.LocalDate[] range = range(from, to);
        return ApiResponse.of(metricsService.compute(range[0], range[1]));
    }

    @GetMapping(value = "/metrics.csv", produces = "text/csv")
    public ResponseEntity<byte[]> metricsCsv(
            @RequestParam(required = false) java.time.LocalDate from, @RequestParam(required = false) java.time.LocalDate to) {
        java.time.LocalDate[] range = range(from, to);
        MetricsService.Report report = metricsService.compute(range[0], range[1]);
        StringBuilder csv = new StringBuilder("Family,Metric,Value,Unit,Definition\n");
        for (MetricsService.Family family : report.families()) {
            for (MetricsService.Metric m : family.metrics()) {
                csv.append(csvField(family.label())).append(',').append(csvField(m.label())).append(',')
                        .append(m.value() == null ? "" : m.value()).append(',').append(m.unit()).append(',')
                        .append(csvField(m.definition())).append('\n');
            }
        }
        csv.append("\nWindow,").append(report.from()).append(" to ").append(report.to()).append(" (")
                .append(report.timeZone()).append(")\n");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"eoz-metrics-" + report.from() + "-to-" + report.to() + ".csv\"")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static java.time.LocalDate[] range(java.time.LocalDate from, java.time.LocalDate to) {
        java.time.LocalDate end = to != null ? to : java.time.LocalDate.now(MetricsService.ZONE);
        java.time.LocalDate start = from != null ? from : end.minusDays(29);
        if (start.isAfter(end)) throw new BadRequestException("The start date must be on or before the end date.");
        if (start.plusDays(366).isBefore(end)) throw new BadRequestException("Choose a period of at most one year.");
        return new java.time.LocalDate[] {start, end};
    }

    @GetMapping(value = "/overview.csv", produces = "text/csv")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> overviewCsv() {
        ReportOverviewResponse r = overview().data();
        StringBuilder csv = new StringBuilder();
        csv.append("Metric,Value\n");
        csv.append("Published opportunities,").append(r.publishedOpportunities()).append('\n');
        csv.append("Pending review,").append(r.pendingReview()).append('\n');
        csv.append("Archived or rejected,").append(r.archivedOrRejected()).append('\n');
        csv.append("Unpaid invoices,").append(r.unpaidInvoices()).append('\n');
        csv.append("Paid invoices,").append(r.paidInvoices()).append('\n');
        csv.append("Unresolved fraud reports,").append(r.unresolvedFraudReports()).append('\n');
        csv.append('\n').append("Category,Count\n");
        r.categoryMix().forEach(nc -> csv.append(csvField(nc.name())).append(',').append(nc.count()).append('\n'));
        csv.append('\n').append("Region,Count\n");
        r.regionMix().forEach(nc -> csv.append(csvField(nc.name())).append(',').append(nc.count()).append('\n'));
        csv.append('\n').append("Application status,Count\n");
        r.applicationsByStatus().forEach(nc -> csv.append(csvField(nc.name())).append(',').append(nc.count()).append('\n'));
        csv.append('\n').append("Service order status,Count\n");
        r.serviceOrdersByStatus().forEach(nc -> csv.append(csvField(nc.name())).append(',').append(nc.count()).append('\n'));

        String fileName = "eoz-report-" + DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").format(java.time.LocalDateTime.now()) + ".csv";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private String csvField(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private List<NameCount> toNameCounts(List<Object[]> rows) {
        return rows.stream().map(r -> new NameCount(String.valueOf(r[0]), (Long) r[1])).toList();
    }
}
