package zm.eoz.platform.opportunity;

import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.ReferenceNumberService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.notification.NotificationService;
import zm.eoz.platform.opportunity.dto.ModerationActionRequest;
import zm.eoz.platform.opportunity.dto.OpportunityCreateRequest;
import zm.eoz.platform.opportunity.dto.OpportunityDetailResponse;
import zm.eoz.platform.opportunity.dto.OpportunityModerationSummary;
import zm.eoz.platform.opportunity.dto.OpportunitySummaryResponse;

@Service
public class OpportunityService {

    private static final Pattern NON_LATIN = Pattern.compile("[^a-z0-9]+");

    private final OpportunityRepository opportunityRepository;
    private final OpportunityCategoryRepository categoryRepository;
    private final ReferenceNumberService referenceNumberService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final zm.eoz.platform.candidate.SavedOpportunityRepository savedOpportunityRepository;
    private final zm.eoz.platform.organisation.OrganisationMemberRepository organisationMemberRepository;

    public OpportunityService(
            OpportunityRepository opportunityRepository,
            OpportunityCategoryRepository categoryRepository,
            ReferenceNumberService referenceNumberService,
            AuditService auditService,
            NotificationService notificationService,
            zm.eoz.platform.candidate.SavedOpportunityRepository savedOpportunityRepository,
            zm.eoz.platform.organisation.OrganisationMemberRepository organisationMemberRepository) {
        this.opportunityRepository = opportunityRepository;
        this.categoryRepository = categoryRepository;
        this.referenceNumberService = referenceNumberService;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.savedOpportunityRepository = savedOpportunityRepository;
        this.organisationMemberRepository = organisationMemberRepository;
    }

    @Transactional(readOnly = true)
    public Page<OpportunitySummaryResponse> search(
            String categoryCode,
            String region,
            String query,
            Boolean verifiedOnly,
            Integer deadlineWithinDays,
            java.util.UUID organisationId,
            String employmentType,
            String workArrangement,
            String experienceLevel,
            Pageable pageable) {
        String normalizedCategory = (categoryCode == null || categoryCode.isBlank() || categoryCode.equalsIgnoreCase("All"))
                ? null
                : categoryCode.toUpperCase(Locale.ROOT);
        String normalizedRegion = (region == null || region.isBlank() || region.equalsIgnoreCase("All regions"))
                ? null
                : region;
        String normalizedQuery = (query == null || query.isBlank()) ? null : query.toLowerCase(Locale.ROOT);

        Specification<Opportunity> spec = (root, cq, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), OpportunityStatus.PUBLISHED));
            if (normalizedCategory != null) {
                predicates.add(cb.equal(root.get("category").get("code"), normalizedCategory));
            }
            if (normalizedRegion != null) {
                predicates.add(cb.equal(root.get("region"), normalizedRegion));
            }
            if (normalizedQuery != null) {
                String likeTerm = "%" + normalizedQuery + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), likeTerm),
                        cb.like(cb.lower(root.get("organisationName")), likeTerm)));
            }
            if (Boolean.TRUE.equals(verifiedOnly)) {
                predicates.add(cb.isTrue(root.get("verified")));
            }
            if (deadlineWithinDays != null) {
                Instant cutoff = Instant.now().plus(java.time.Duration.ofDays(deadlineWithinDays));
                predicates.add(cb.lessThanOrEqualTo(root.get("deadline"), cutoff));
            }
            if (organisationId != null) {
                predicates.add(cb.equal(root.get("organisation").get("id"), organisationId));
            }
            if (employmentType != null && !employmentType.isBlank()) {
                predicates.add(cb.equal(root.get("employmentType"), parseEnum(EmploymentType.class, employmentType, "employmentType")));
            }
            if (workArrangement != null && !workArrangement.isBlank()) {
                predicates.add(cb.equal(root.get("workArrangement"), parseEnum(WorkArrangement.class, workArrangement, "workArrangement")));
            }
            if (experienceLevel != null && !experienceLevel.isBlank()) {
                predicates.add(cb.equal(root.get("experienceLevel"), parseEnum(ExperienceLevel.class, experienceLevel, "experienceLevel")));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        return opportunityRepository.findAll(spec, pageable).map(OpportunitySummaryResponse::from);
    }

    @Transactional
    public OpportunityDetailResponse getBySlug(String slug) {
        Opportunity opportunity = opportunityRepository
                .findBySlugAndStatus(slug, OpportunityStatus.PUBLISHED)
                .orElseThrow(() -> new NotFoundException("Opportunity not found: " + slug));
        opportunity.setViewsCount(opportunity.getViewsCount() + 1);
        return OpportunityDetailResponse.from(opportunity);
    }

    @Transactional
    public OpportunityDetailResponse create(OpportunityCreateRequest request, User createdBy) {
        OpportunityCategory category = categoryRepository
                .findByCodeIgnoreCase(request.categoryCode())
                .orElseThrow(() -> new BadRequestException("Unknown category: " + request.categoryCode()));

        ApplicationMode mode;
        try {
            mode = ApplicationMode.valueOf(request.applicationMode());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown application mode: " + request.applicationMode());
        }
        validateApplicationRoute(mode, request);

        Opportunity opportunity = new Opportunity();
        opportunity.setReference(referenceNumberService.next("EOZ-OPP"));
        opportunity.setSlug(slugify(request.title()));
        opportunity.setTitle(request.title());
        opportunity.setCategory(category);
        opportunity.setOrganisationName(request.organisationName());
        opportunity.setDescription(request.description());
        opportunity.setResponsibilities(request.responsibilities());
        opportunity.setRequirements(request.requirements());
        opportunity.setBenefits(request.benefits());
        opportunity.setLocation(request.location());
        opportunity.setRegion(request.region());
        opportunity.setWorkMode(request.workMode());
        opportunity.setEmploymentType(parseEnum(EmploymentType.class, request.employmentType(), "employmentType"));
        opportunity.setWorkArrangement(parseEnum(WorkArrangement.class, request.workArrangement(), "workArrangement"));
        opportunity.setExperienceLevel(parseEnum(ExperienceLevel.class, request.experienceLevel(), "experienceLevel"));
        opportunity.setOpportunityValue(request.opportunityValue());
        opportunity.setOpportunityValueUnit(request.opportunityValueUnit());
        opportunity.setSalaryMin(request.salaryMin());
        opportunity.setSalaryMax(request.salaryMax());
        opportunity.setSalaryVisible(request.salaryVisible());
        opportunity.setDeadline(request.deadline());
        opportunity.setApplicationMode(mode);
        opportunity.setApplicationUrl(request.applicationUrl());
        opportunity.setApplicationEmail(request.applicationEmail());
        opportunity.setApplicationAddress(request.applicationAddress());
        opportunity.setSource(request.source());
        opportunity.setStatus(OpportunityStatus.PENDING_REVIEW);
        opportunity.setCreatedBy(createdBy);
        opportunity.setFlaggedDuplicateOf(findPotentialDuplicate(request).orElse(null));
        java.util.List<zm.eoz.platform.organisation.OrganisationMember> memberships =
                organisationMemberRepository.findById_UserId(createdBy.getId());
        if (!memberships.isEmpty()) {
            opportunity.setOrganisation(memberships.get(0).getOrganisation());
        }

        opportunity = opportunityRepository.save(opportunity);
        auditService.record(
                createdBy,
                "SUBMITTED",
                "Opportunity",
                opportunity.getReference(),
                "Submitted \"" + opportunity.getTitle() + "\" for review");
        return OpportunityDetailResponse.from(opportunity);
    }

    /** The authenticated user's own submissions, across every status. */
    @Transactional(readOnly = true)
    public Page<zm.eoz.platform.opportunity.dto.EmployerOpportunitySummary> myListings(User user, Pageable pageable) {
        return opportunityRepository
                .findByCreatedByIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(o -> zm.eoz.platform.opportunity.dto.EmployerOpportunitySummary.from(
                        o, savedOpportunityRepository.countById_OpportunityId(o.getId())));
    }

    @Transactional(readOnly = true)
    public zm.eoz.platform.opportunity.dto.EmployerOpportunityStats myListingsStats(User user) {
        java.util.UUID userId = user.getId();
        long published = opportunityRepository.countByCreatedByIdAndStatus(userId, OpportunityStatus.PUBLISHED);
        long pendingReview = opportunityRepository.countByCreatedByIdAndStatusIn(
                userId, List.of(OpportunityStatus.PENDING_REVIEW, OpportunityStatus.APPROVED, OpportunityStatus.SCHEDULED));
        long drafts = opportunityRepository.countByCreatedByIdAndStatus(userId, OpportunityStatus.DRAFT);
        long closed = opportunityRepository.countByCreatedByIdAndStatusIn(
                userId, List.of(OpportunityStatus.CLOSED, OpportunityStatus.EXPIRED, OpportunityStatus.ARCHIVED));
        return new zm.eoz.platform.opportunity.dto.EmployerOpportunityStats(published, pendingReview, drafts, closed);
    }

    @Transactional(readOnly = true)
    public zm.eoz.platform.opportunity.dto.EmployerAnalyticsSummary myAnalytics(User user) {
        List<Opportunity> mine = opportunityRepository.findByCreatedById(user.getId());
        long totalViews = mine.stream().mapToLong(Opportunity::getViewsCount).sum();
        List<java.util.UUID> ids = mine.stream().map(Opportunity::getId).toList();
        long totalSaves = ids.isEmpty() ? 0 : savedOpportunityRepository.countById_OpportunityIdIn(ids);

        List<zm.eoz.platform.opportunity.dto.EmployerAnalyticsSummary.TopListing> topListings = mine.stream()
                .sorted((a, b) -> Long.compare(b.getViewsCount(), a.getViewsCount()))
                .limit(5)
                .map(o -> new zm.eoz.platform.opportunity.dto.EmployerAnalyticsSummary.TopListing(
                        o.getTitle(), o.getSlug(), o.getViewsCount()))
                .toList();

        List<zm.eoz.platform.opportunity.dto.EmployerAnalyticsSummary.CategoryCount> categoryMix = mine.stream()
                .collect(java.util.stream.Collectors.groupingBy(o -> o.getCategory().getName(), java.util.stream.Collectors.counting()))
                .entrySet()
                .stream()
                .map(e -> new zm.eoz.platform.opportunity.dto.EmployerAnalyticsSummary.CategoryCount(e.getKey(), e.getValue()))
                .sorted((a, b) -> Long.compare(b.count(), a.count()))
                .toList();

        return new zm.eoz.platform.opportunity.dto.EmployerAnalyticsSummary(
                mine.size(), totalViews, totalSaves, topListings, categoryMix);
    }

    /** Staff-wide view across every status (unlike the public search, which only returns PUBLISHED). */
    @Transactional(readOnly = true)
    public Page<OpportunityModerationSummary> adminList(String status, String query, Pageable pageable) {
        if ((status == null || status.isBlank()) && (query == null || query.isBlank())) {
            return opportunityRepository.findAllByOrderByCreatedAtDesc(pageable).map(OpportunityModerationSummary::from);
        }

        OpportunityStatus parsedStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                parsedStatus = OpportunityStatus.valueOf(status);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown status: " + status);
            }
        }
        String normalizedQuery = (query == null || query.isBlank()) ? null : query.toLowerCase(Locale.ROOT);
        OpportunityStatus finalStatus = parsedStatus;

        Specification<Opportunity> spec = (root, cq, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (finalStatus != null) {
                predicates.add(cb.equal(root.get("status"), finalStatus));
            }
            if (normalizedQuery != null) {
                String likeTerm = "%" + normalizedQuery + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), likeTerm),
                        cb.like(cb.lower(root.get("organisationName")), likeTerm),
                        cb.like(cb.lower(root.get("reference")), likeTerm)));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        return opportunityRepository.findAll(spec, pageable).map(OpportunityModerationSummary::from);
    }

    @Transactional(readOnly = true)
    public Page<OpportunityModerationSummary> moderationQueue(Pageable pageable) {
        return opportunityRepository
                .findByStatusInOrderByCreatedAtAsc(
                        List.of(OpportunityStatus.PENDING_REVIEW, OpportunityStatus.APPROVED), pageable)
                .map(OpportunityModerationSummary::from);
    }

    @Transactional
    public OpportunityDetailResponse approve(java.util.UUID id, User actor) {
        Opportunity opportunity = requireStatus(id, OpportunityStatus.PENDING_REVIEW);
        opportunity.setStatus(OpportunityStatus.APPROVED);
        auditService.record(
                actor, "APPROVED", "Opportunity", opportunity.getReference(), "Approved \"" + opportunity.getTitle() + "\"");
        notifyCreator(opportunity, "OPPORTUNITY_APPROVED", "Your listing was approved",
                "\"" + opportunity.getTitle() + "\" (" + opportunity.getReference() + ") has been approved and is awaiting publication.");
        return OpportunityDetailResponse.from(opportunity);
    }

    @Transactional
    public OpportunityDetailResponse schedule(java.util.UUID id, Instant scheduledAt, User actor) {
        Opportunity opportunity = requireStatus(id, OpportunityStatus.APPROVED);
        if (scheduledAt.isBefore(Instant.now())) {
            throw new BadRequestException("scheduledAt must be in the future.");
        }
        opportunity.setScheduledAt(scheduledAt);
        opportunity.setStatus(OpportunityStatus.SCHEDULED);
        auditService.record(
                actor, "SCHEDULED", "Opportunity", opportunity.getReference(), "Scheduled for " + scheduledAt);
        return OpportunityDetailResponse.from(opportunity);
    }

    /** Publishes everything whose scheduled time has arrived. Called by the background job. */
    @Transactional
    public int publishDueScheduled() {
        List<Opportunity> due = opportunityRepository.findByStatusAndScheduledAtBefore(OpportunityStatus.SCHEDULED, Instant.now());
        for (Opportunity o : due) {
            o.setStatus(OpportunityStatus.PUBLISHED);
            o.setPublishedAt(Instant.now());
            notifyCreator(o, "OPPORTUNITY_PUBLISHED", "Your listing is now live",
                    "\"" + o.getTitle() + "\" (" + o.getReference() + ") is now published on the public board.");
        }
        return due.size();
    }

    @Transactional
    public OpportunityDetailResponse publish(java.util.UUID id, User actor) {
        Opportunity opportunity = opportunityRepository
                .findById(id)
                .orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (opportunity.getStatus() != OpportunityStatus.APPROVED && opportunity.getStatus() != OpportunityStatus.SCHEDULED) {
            throw new BadRequestException(
                    "Opportunity is " + opportunity.getStatus() + ", expected APPROVED or SCHEDULED to publish.");
        }
        opportunity.setStatus(OpportunityStatus.PUBLISHED);
        opportunity.setPublishedAt(Instant.now());
        auditService.record(
                actor, "PUBLISHED", "Opportunity", opportunity.getReference(), "Published \"" + opportunity.getTitle() + "\"");
        notifyCreator(opportunity, "OPPORTUNITY_PUBLISHED", "Your listing is now live",
                "\"" + opportunity.getTitle() + "\" (" + opportunity.getReference() + ") is now published on the public board.");
        return OpportunityDetailResponse.from(opportunity);
    }

    @Transactional
    public OpportunityDetailResponse requestChanges(java.util.UUID id, ModerationActionRequest request, User actor) {
        Opportunity opportunity = requireStatus(id, OpportunityStatus.PENDING_REVIEW);
        opportunity.setStatus(OpportunityStatus.DRAFT);
        auditService.record(
                actor,
                "CHANGES_REQUESTED",
                "Opportunity",
                opportunity.getReference(),
                "Requested changes to \"" + opportunity.getTitle() + "\": " + safeReason(request));
        notifyCreator(opportunity, "OPPORTUNITY_CHANGES_REQUESTED", "Changes requested on your listing",
                "\"" + opportunity.getTitle() + "\" (" + opportunity.getReference() + ") needs changes: " + safeReason(request));
        return OpportunityDetailResponse.from(opportunity);
    }

    @Transactional
    public OpportunityDetailResponse reject(java.util.UUID id, ModerationActionRequest request, User actor) {
        Opportunity opportunity = requireStatus(id, OpportunityStatus.PENDING_REVIEW);
        opportunity.setStatus(OpportunityStatus.ARCHIVED);
        auditService.record(
                actor,
                "REJECTED",
                "Opportunity",
                opportunity.getReference(),
                "Rejected \"" + opportunity.getTitle() + "\": " + safeReason(request));
        notifyCreator(opportunity, "OPPORTUNITY_REJECTED", "Your listing was rejected",
                "\"" + opportunity.getTitle() + "\" (" + opportunity.getReference() + ") was rejected: " + safeReason(request));
        return OpportunityDetailResponse.from(opportunity);
    }

    private void notifyCreator(Opportunity opportunity, String type, String title, String body) {
        if (opportunity.getCreatedBy() != null) {
            notificationService.notify(opportunity.getCreatedBy(), type, title, body);
        }
    }

    private String safeReason(ModerationActionRequest request) {
        return request != null && request.reason() != null && !request.reason().isBlank()
                ? request.reason()
                : "No reason given";
    }

    private Opportunity requireStatus(java.util.UUID id, OpportunityStatus expected) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (opportunity.getStatus() != expected) {
            throw new BadRequestException(
                    "Opportunity is " + opportunity.getStatus() + ", expected " + expected + " for this action.");
        }
        return opportunity;
    }

    /**
     * Enforces the platform's non-negotiable brand rule: a third-party opportunity's application
     * route must be the employer's own channel, never EOZ's contact details.
     */
    private void validateApplicationRoute(ApplicationMode mode, OpportunityCreateRequest request) {
        switch (mode) {
            case EXTERNAL_URL -> {
                if (request.applicationUrl() == null || request.applicationUrl().isBlank()) {
                    throw new BadRequestException("applicationUrl is required for EXTERNAL_URL opportunities.");
                }
            }
            case EMPLOYER_EMAIL -> {
                if (request.applicationEmail() == null || request.applicationEmail().isBlank()) {
                    throw new BadRequestException("applicationEmail is required for EMPLOYER_EMAIL opportunities.");
                }
            }
            case PHYSICAL_ADDRESS -> {
                if (request.applicationAddress() == null || request.applicationAddress().isBlank()) {
                    throw new BadRequestException(
                            "applicationAddress is required for PHYSICAL_ADDRESS opportunities.");
                }
            }
            default -> {
                // EOZ_HOSTED, INFORMATION_ONLY, EOZ_INTERNAL_HIRING carry no external route requirement.
            }
        }
    }

    /**
     * Flags (never blocks) a submission that matches an existing non-archived opportunity by
     * source URL, or by exact title+organisation — moderation decides what to do with the match.
     */
    private java.util.Optional<Opportunity> findPotentialDuplicate(OpportunityCreateRequest request) {
        if (request.source() != null && !request.source().isBlank()) {
            List<Opportunity> bySource =
                    opportunityRepository.findBySourceAndStatusNot(request.source(), OpportunityStatus.ARCHIVED);
            if (!bySource.isEmpty()) {
                return java.util.Optional.of(bySource.get(0));
            }
        }
        List<Opportunity> byTitleAndOrg = opportunityRepository.findByTitleIgnoreCaseAndOrganisationNameIgnoreCaseAndStatusNot(
                request.title(), request.organisationName(), OpportunityStatus.ARCHIVED);
        return byTitleAndOrg.isEmpty() ? java.util.Optional.empty() : java.util.Optional.of(byTitleAndOrg.get(0));
    }

    @Transactional
    public int closeExpired() {
        return opportunityRepository.closeExpired(Instant.now());
    }

    private <E extends Enum<E>> E parseEnum(Class<E> type, String value, String fieldName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(type, value);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown " + fieldName + ": " + value);
        }
    }

    private String slugify(String title) {
        String normalized = Normalizer.normalize(title, Normalizer.Form.NFD).toLowerCase(Locale.ROOT);
        String base = NON_LATIN.matcher(normalized).replaceAll("-").replaceAll("^-|-$", "");
        String slug = base;
        int suffix = 1;
        while (opportunityRepository.existsBySlug(slug)) {
            slug = base + "-" + (++suffix);
        }
        return slug;
    }
}
