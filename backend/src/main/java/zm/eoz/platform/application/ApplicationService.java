package zm.eoz.platform.application;

import java.time.Instant;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.application.dto.ApplicationRequest;
import zm.eoz.platform.application.dto.ApplicationResponse;
import zm.eoz.platform.candidate.CandidateProfileRepository;
import zm.eoz.platform.common.ReferenceNumberService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.ForbiddenException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.opportunity.ApplicationMode;
import zm.eoz.platform.opportunity.Opportunity;
import zm.eoz.platform.opportunity.OpportunityRepository;
import zm.eoz.platform.opportunity.OpportunityStatus;
import zm.eoz.platform.organisation.OrganisationMemberRepository;

@Service
public class ApplicationService {

    private static final Set<String> STAFF_ROLES = Set.of("MANAGER", "ADMIN", "RECRUITMENT_OFFICER");

    private final CandidateApplicationRepository applicationRepository;
    private final OpportunityRepository opportunityRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final OrganisationMemberRepository organisationMemberRepository;
    private final ReferenceNumberService referenceNumberService;
    private final zm.eoz.platform.notification.NotificationService notificationService;

    public ApplicationService(
            CandidateApplicationRepository applicationRepository,
            OpportunityRepository opportunityRepository,
            CandidateProfileRepository candidateProfileRepository,
            OrganisationMemberRepository organisationMemberRepository,
            ReferenceNumberService referenceNumberService,
            zm.eoz.platform.notification.NotificationService notificationService) {
        this.notificationService = notificationService;
        this.applicationRepository = applicationRepository;
        this.opportunityRepository = opportunityRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.organisationMemberRepository = organisationMemberRepository;
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

        java.util.UUID resumeFileId = request.resumeFileId() != null
                ? request.resumeFileId()
                : candidateProfileRepository.findById(candidate.getId()).map(p -> p.getResumeFileId()).orElse(null);

        CandidateApplication application = new CandidateApplication();
        application.setReference(referenceNumberService.next("EOZ-APP"));
        application.setOpportunity(opportunity);
        application.setCandidate(candidate);
        application.setCoverNote(request.coverNote());
        application.setResumeFileId(resumeFileId);

        return ApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public java.util.List<ApplicationResponse> listMine(java.util.UUID candidateId) {
        return applicationRepository.findByCandidateIdOrderBySubmittedAtDesc(candidateId).stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<ApplicationResponse> listForOpportunity(java.util.UUID opportunityId, User actor) {
        Opportunity opportunity = requireOpportunityAccess(opportunityId, actor);
        return applicationRepository.findByOpportunityIdOrderBySubmittedAtDesc(opportunity.getId()).stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<ApplicationResponse> searchAll(
            String status, String query, org.springframework.data.domain.Pageable pageable) {
        String q = query == null ? "" : query.trim();
        if (status == null || status.isBlank()) {
            return applicationRepository.search(q, pageable).map(ApplicationResponse::from);
        }
        ApplicationStatus parsed;
        try {
            parsed = ApplicationStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status: " + status);
        }
        return applicationRepository.searchByStatus(parsed, q, pageable).map(ApplicationResponse::from);
    }

    @Transactional
    public ApplicationResponse updateStatus(java.util.UUID applicationId, String statusValue, User actor) {
        CandidateApplication application = applicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found: " + applicationId));
        requireOpportunityAccess(application.getOpportunity().getId(), actor);

        ApplicationStatus status;
        try {
            status = ApplicationStatus.valueOf(statusValue);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status: " + statusValue);
        }
        ApplicationStatus previous = application.getStatus();
        application.setStatus(status);
        if (previous != status) {
            notificationService.notify(
                    application.getCandidate(),
                    "APPLICATION_STATUS",
                    "Your application was updated",
                    "Your application for \"" + application.getOpportunity().getTitle() + "\" ("
                            + application.getReference() + ") is now " + status.name().replace('_', ' ') + ".");
        }
        return ApplicationResponse.from(applicationRepository.save(application));
    }

    @Transactional
    public ApplicationResponse withdraw(java.util.UUID applicationId, User actor) {
        CandidateApplication application = applicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found: " + applicationId));
        if (!application.getCandidate().getId().equals(actor.getId())) {
            throw new ForbiddenException("You can only withdraw your own applications.");
        }
        ApplicationStatus current = application.getStatus();
        if (current == ApplicationStatus.HIRED || current == ApplicationStatus.REJECTED || current == ApplicationStatus.WITHDRAWN) {
            throw new BadRequestException("An application that is " + current + " cannot be withdrawn.");
        }
        application.setStatus(ApplicationStatus.WITHDRAWN);
        return ApplicationResponse.from(applicationRepository.save(application));
    }

    /** Returns the resume file id an employer/staff caller is authorised to download for this application. */
    @Transactional(readOnly = true)
    public java.util.UUID authoriseResumeAccess(java.util.UUID applicationId, User actor) {
        CandidateApplication application = applicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new NotFoundException("Application not found: " + applicationId));
        boolean isCandidate = application.getCandidate().getId().equals(actor.getId());
        if (!isCandidate) {
            requireOpportunityAccess(application.getOpportunity().getId(), actor);
        }
        if (application.getResumeFileId() == null) {
            throw new NotFoundException("This application has no CV attached.");
        }
        return application.getResumeFileId();
    }

    /** Staff, or a member of the organisation the opportunity belongs to (falling back to its creator when unlinked). */
    private Opportunity requireOpportunityAccess(java.util.UUID opportunityId, User actor) {
        Opportunity opportunity = opportunityRepository
                .findById(opportunityId)
                .orElseThrow(() -> new NotFoundException("Opportunity not found: " + opportunityId));
        boolean isStaff = actor.getRoles().stream().anyMatch(r -> STAFF_ROLES.contains(r.getName()));
        boolean isAuthorised = isStaff;
        if (!isAuthorised && opportunity.getOrganisation() != null) {
            isAuthorised = organisationMemberRepository
                    .findById_OrganisationIdAndId_UserId(opportunity.getOrganisation().getId(), actor.getId())
                    .isPresent();
        }
        if (!isAuthorised && opportunity.getOrganisation() == null) {
            isAuthorised = opportunity.getCreatedBy() != null && opportunity.getCreatedBy().getId().equals(actor.getId());
        }
        if (!isAuthorised) {
            throw new ForbiddenException("You do not have access to applicants for this opportunity.");
        }
        return opportunity;
    }
}
