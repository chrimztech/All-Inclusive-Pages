package zm.eoz.platform.opportunity;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.opportunity.dto.FraudReportRequest;
import zm.eoz.platform.opportunity.dto.FraudReportResponse;

@Service
public class FraudReportService {

    private final FraudReportRepository fraudReportRepository;
    private final OpportunityRepository opportunityRepository;
    private final AuditService auditService;

    public FraudReportService(
            FraudReportRepository fraudReportRepository, OpportunityRepository opportunityRepository, AuditService auditService) {
        this.fraudReportRepository = fraudReportRepository;
        this.opportunityRepository = opportunityRepository;
        this.auditService = auditService;
    }

    @Transactional
    public FraudReportResponse submit(FraudReportRequest request) {
        FraudReport report = new FraudReport();
        report.setReason(request.reason());
        report.setDescription(request.description());
        report.setReporterName(request.reporterName());
        report.setReporterEmail(request.reporterEmail());
        report.setListingReference(request.listingReference());

        if (request.listingReference() != null && !request.listingReference().isBlank()) {
            String ref = request.listingReference().trim();
            opportunityRepository
                    .findByReferenceIgnoreCase(ref)
                    .or(() -> opportunityRepository.findBySlugIgnoreCase(ref))
                    .ifPresent(report::setOpportunity);
        }

        report = fraudReportRepository.save(report);
        auditService.record(
                null, "FRAUD_REPORT_SUBMITTED", "FraudReport", report.getId().toString(),
                "Reported: " + request.reason());
        return FraudReportResponse.from(report);
    }

    @Transactional(readOnly = true)
    public Page<FraudReportResponse> list(String status, Pageable pageable) {
        Page<FraudReport> page = (status == null || status.isBlank())
                ? fraudReportRepository.findAllByOrderByCreatedAtDesc(pageable)
                : fraudReportRepository.findByStatusOrderByCreatedAtAsc(parseStatus(status), pageable);
        return page.map(FraudReportResponse::from);
    }

    @Transactional
    public FraudReportResponse decide(UUID id, String status, User actor) {
        FraudReport report =
                fraudReportRepository.findById(id).orElseThrow(() -> new NotFoundException("Fraud report not found: " + id));
        report.setStatus(parseStatus(status));
        report.setResolvedAt(java.time.Instant.now());
        report.setResolvedBy(actor);
        auditService.record(actor, "FRAUD_REPORT_" + report.getStatus(), "FraudReport", id.toString(), "Marked " + status);
        return FraudReportResponse.from(report);
    }

    private FraudReport.Status parseStatus(String status) {
        try {
            return FraudReport.Status.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status: " + status);
        }
    }
}
