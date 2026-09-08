package zm.eoz.platform.reporting;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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

    public AdminReportsController(
            OpportunityRepository opportunityRepository,
            CandidateApplicationRepository applicationRepository,
            ServiceOrderRepository serviceOrderRepository,
            InvoiceRepository invoiceRepository,
            FraudReportRepository fraudReportRepository) {
        this.opportunityRepository = opportunityRepository;
        this.applicationRepository = applicationRepository;
        this.serviceOrderRepository = serviceOrderRepository;
        this.invoiceRepository = invoiceRepository;
        this.fraudReportRepository = fraudReportRepository;
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

    private List<NameCount> toNameCounts(List<Object[]> rows) {
        return rows.stream().map(r -> new NameCount(String.valueOf(r[0]), (Long) r[1])).toList();
    }
}
