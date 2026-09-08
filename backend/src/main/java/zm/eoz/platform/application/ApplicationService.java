package zm.eoz.platform.application;

import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.application.dto.ApplicationRequest;
import zm.eoz.platform.application.dto.ApplicationResponse;
import zm.eoz.platform.common.ReferenceNumberService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.opportunity.ApplicationMode;
import zm.eoz.platform.opportunity.Opportunity;
import zm.eoz.platform.opportunity.OpportunityRepository;
import zm.eoz.platform.opportunity.OpportunityStatus;

@Service
public class ApplicationService {

    private final CandidateApplicationRepository applicationRepository;
    private final OpportunityRepository opportunityRepository;
    private final ReferenceNumberService referenceNumberService;

    public ApplicationService(
            CandidateApplicationRepository applicationRepository,
            OpportunityRepository opportunityRepository,
            ReferenceNumberService referenceNumberService) {
        this.applicationRepository = applicationRepository;
        this.opportunityRepository = opportunityRepository;
        this.referenceNumberService = referenceNumberService;
    }

    @Transactional
    public ApplicationResponse apply(java.util.UUID opportunityId, ApplicationRequest request, User candidate) {
        Opportunity opportunity = opportunityRepository
                .findById(opportunityId)
                .orElseThrow(() -> new NotFoundException("Opportunity not found: " + opportunityId));

        if (opportunity.getStatus() != OpportunityStatus.PUBLISHED) {
            throw new BadRequestException("This opportunity is not open for applications.");
        }
        if (opportunity.getApplicationMode() != ApplicationMode.EOZ_HOSTED) {
            throw new BadRequestException(
                    "EOZ does not accept applications for this opportunity — use the employer's application route.");
        }
        if (opportunity.getDeadline() != null && opportunity.getDeadline().isBefore(Instant.now())) {
            throw new BadRequestException("The application deadline for this opportunity has passed.");
        }
        if (applicationRepository.existsByOpportunityIdAndCandidateId(opportunityId, candidate.getId())) {
            throw new ConflictException("You have already applied to this opportunity.");
        }

        CandidateApplication application = new CandidateApplication();
        application.setReference(referenceNumberService.next("EOZ-APP"));
        application.setOpportunity(opportunity);
        application.setCandidate(candidate);
        application.setCoverNote(request.coverNote());

        return ApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public java.util.List<ApplicationResponse> listMine(java.util.UUID candidateId) {
        return applicationRepository.findByCandidateIdOrderBySubmittedAtDesc(candidateId).stream()
                .map(ApplicationResponse::from)
                .toList();
    }
}
