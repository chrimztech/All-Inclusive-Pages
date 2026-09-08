package zm.eoz.platform.reporting;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.application.CandidateApplicationRepository;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.opportunity.OpportunityRepository;
import zm.eoz.platform.opportunity.OpportunityStatus;
import zm.eoz.platform.organisation.OrganisationRepository;
import zm.eoz.platform.organisation.VerificationStatus;

/** Public, unauthenticated: real platform-wide counts shown on marketing pages (no fabricated figures). */
@RestController
public class PublicStatsController {

    private final OrganisationRepository organisationRepository;
    private final OpportunityRepository opportunityRepository;
    private final CandidateApplicationRepository applicationRepository;

    public PublicStatsController(
            OrganisationRepository organisationRepository,
            OpportunityRepository opportunityRepository,
            CandidateApplicationRepository applicationRepository) {
        this.organisationRepository = organisationRepository;
        this.opportunityRepository = opportunityRepository;
        this.applicationRepository = applicationRepository;
    }

    @GetMapping("/api/v1/stats/public")
    @Transactional(readOnly = true)
    public ApiResponse<PublicStatsResponse> publicStats() {
        return ApiResponse.of(new PublicStatsResponse(
                organisationRepository.countByVerificationStatus(VerificationStatus.VERIFIED),
                opportunityRepository.countByStatus(OpportunityStatus.PUBLISHED),
                applicationRepository.countBySubmittedAtAfter(Instant.now().minus(7, ChronoUnit.DAYS)),
                opportunityRepository.averageReviewHours()));
    }
}
