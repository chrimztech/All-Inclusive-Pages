package zm.eoz.platform.opportunity;

import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    private final OpportunityVersionRecorder versionRecorder;

    public OpportunityService(
            OpportunityRepository opportunityRepository,
            OpportunityCategoryRepository categoryRepository,
            ReferenceNumberService referenceNumberService,
            AuditService auditService,
            NotificationService notificationService,
            zm.eoz.platform.candidate.SavedOpportunityRepository savedOpportunityRepository,
            zm.eoz.platform.organisation.OrganisationMemberRepository organisationMemberRepository,
            OpportunityVersionRecorder versionRecorder) {
        this.versionRecorder = versionRecorder;
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
            String order,
            Boolean featured,
            Integer postedWithinDays,
            java.math.BigDecimal minSalary,
            Pageable pageable) {
        Pageable ordered = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), publicOrder(order, pageable.getSort()));
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
                        cb.like(cb.lower(root.get("organisationName")), likeTerm),
                        cb.like(cb.lower(root.get("reference")), likeTerm)));
            }
            if (postedWithinDays != null && postedWithinDays > 0) {
                Instant since = Instant.now().minus(java.time.Duration.ofDays(postedWithinDays));
                predicates.add(cb.greaterThanOrEqualTo(root.get("publishedAt"), since));
            }
            if (minSalary != null) {
                // Only listings that publish their pay; a range qualifies if its top reaches the minimum asked for.
                predicates.add(cb.isTrue(root.get("salaryVisible")));
                predicates.add(cb.greaterThanOrEqualTo(
                        cb.coalesce(root.<java.math.BigDecimal>get("salaryMax"), root.<java.math.BigDecimal>get("salaryMin")),
                        minSalary));
            }
            if (Boolean.TRUE.equals(featured)) {
                predicates.add(cb.isTrue(root.get("featured")));
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

        return opportunityRepository.findAll(spec, ordered).map(OpportunitySummaryResponse::from);
    }

    /**
     * Public board ordering: {@code newest} (default), {@code top} (most viewed) or {@code closing} (nearest
     * deadline first). An explicit {@code sort=} on the request is honoured when no named order is given.
     */
    static Sort publicOrder(String order, Sort requested) {
        Sort newest = Sort.by(Sort.Order.desc("publishedAt").nullsLast(), Sort.Order.desc("createdAt"));
        if (order == null || order.isBlank()) {
            return requested.isSorted() ? requested : newest;
        }
        return switch (order.toLowerCase(Locale.ROOT)) {
            case "newest" -> newest;
            case "top" -> Sort.by(Sort.Order.desc("viewsCount")).and(newest);
            case "closing" -> Sort.by(Sort.Order.asc("deadline").nullsLast()).and(newest);
            default -> throw new BadRequestException("Unknown order: " + order + ". Use newest, top or closing.");
        };
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
        validateApplicationRoute(mode, request.applicationUrl(), request.applicationEmail(), request.applicationAddress());

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

    @Transactional
    public OpportunityDetailResponse close(java.util.UUID id, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (opportunity.getStatus() != OpportunityStatus.PUBLISHED) {
            throw new BadRequestException("Opportunity is " + opportunity.getStatus() + ", expected PUBLISHED to close.");
        }
        opportunity.setStatus(OpportunityStatus.CLOSED);
        auditService.record(
                actor, "CLOSED", "Opportunity", opportunity.getReference(), "Closed \"" + opportunity.getTitle() + "\"");
        notifyCreator(opportunity, "OPPORTUNITY_CLOSED", "Your listing was closed",
                "\"" + opportunity.getTitle() + "\" (" + opportunity.getReference() + ") has been closed and removed from the public board.");
        return OpportunityDetailResponse.from(opportunity);
    }

    private boolean canManage(Opportunity opportunity, User actor) {
        boolean staff = actor.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .anyMatch(p -> "OPPORTUNITY_MODERATE".equals(p.getCode()));
        if (staff) {
            return true;
        }
        return opportunity.getOrganisation() != null
                ? organisationMemberRepository
                        .findById_OrganisationIdAndId_UserId(opportunity.getOrganisation().getId(), actor.getId())
                        .isPresent()
                : opportunity.getCreatedBy() != null && opportunity.getCreatedBy().getId().equals(actor.getId());
    }

    private boolean isStaff(User actor) {
        return actor.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .anyMatch(p -> "OPPORTUNITY_MODERATE".equals(p.getCode()));
    }

    @Transactional(readOnly = true)
    public List<OpportunityVersionRecorder.Version> versions(java.util.UUID id, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (!canManage(opportunity, actor)) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You do not have access to this listing.");
        }
        return versionRecorder.history(id);
    }

    @Transactional(readOnly = true)
    public OpportunityDetailResponse getForManage(java.util.UUID id, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (!canManage(opportunity, actor)) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You do not have access to this listing.");
        }
        return OpportunityDetailResponse.from(opportunity);
    }

    /**
     * Edits a listing. Staff edits keep the current status. When the owner edits a listing it goes back into the
     * review queue, so changes (including after "request changes") are always re-checked before going live.
     */
    @Transactional
    public OpportunityDetailResponse update(
            java.util.UUID id, zm.eoz.platform.opportunity.dto.OpportunityUpdateRequest request, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (!canManage(opportunity, actor)) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You do not have access to this listing.");
        }
        OpportunityStatus current = opportunity.getStatus();
        if (current == OpportunityStatus.CLOSED || current == OpportunityStatus.EXPIRED || current == OpportunityStatus.ARCHIVED) {
            throw new BadRequestException("A " + current + " listing cannot be edited. Reopen it first.");
        }
        if (request.title() != null) {
            if (request.title().isBlank()) {
                throw new BadRequestException("Title cannot be blank.");
            }
            opportunity.setTitle(request.title().trim());
        }
        if (request.categoryCode() != null && !request.categoryCode().isBlank()) {
            opportunity.setCategory(categoryRepository
                    .findByCodeIgnoreCase(request.categoryCode())
                    .orElseThrow(() -> new BadRequestException("Unknown category: " + request.categoryCode())));
        }
        if (request.description() != null) opportunity.setDescription(request.description());
        if (request.responsibilities() != null) opportunity.setResponsibilities(request.responsibilities());
        if (request.requirements() != null) opportunity.setRequirements(request.requirements());
        if (request.benefits() != null) opportunity.setBenefits(request.benefits());
        if (request.location() != null) opportunity.setLocation(request.location());
        if (request.region() != null) opportunity.setRegion(request.region());
        if (request.workMode() != null) opportunity.setWorkMode(request.workMode());
        if (request.deadline() != null) opportunity.setDeadline(request.deadline());
        if (request.applicationUrl() != null) opportunity.setApplicationUrl(request.applicationUrl());
        if (request.applicationEmail() != null) opportunity.setApplicationEmail(request.applicationEmail());
        if (request.applicationAddress() != null) opportunity.setApplicationAddress(request.applicationAddress());
        if (request.source() != null) opportunity.setSource(request.source());
        if (request.applicationMode() != null && !request.applicationMode().isBlank()) {
            opportunity.setApplicationMode(parseEnum(ApplicationMode.class, request.applicationMode(), "applicationMode"));
        }
        validateApplicationRoute(
                opportunity.getApplicationMode(),
                opportunity.getApplicationUrl(),
                opportunity.getApplicationEmail(),
                opportunity.getApplicationAddress());

        boolean resubmitted = false;
        if (!isStaff(actor) && current != OpportunityStatus.PENDING_REVIEW) {
            opportunity.setStatus(OpportunityStatus.PENDING_REVIEW);
            opportunity.setScheduledAt(null);
            resubmitted = true;
        }
        auditService.record(
                actor,
                resubmitted ? "EDITED_AND_RESUBMITTED" : "EDITED",
                "Opportunity",
                opportunity.getReference(),
                "Edited \"" + opportunity.getTitle() + "\"" + (resubmitted ? " and sent back for review" : ""));
        return OpportunityDetailResponse.from(opportunity);
    }

    /** Lets the listing's own organisation members (or its creator when unlinked) close a live listing or withdraw an unpublished one. */
    @Transactional
    public OpportunityDetailResponse closeOwn(java.util.UUID id, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        boolean owner = opportunity.getOrganisation() != null
                ? organisationMemberRepository
                        .findById_OrganisationIdAndId_UserId(opportunity.getOrganisation().getId(), actor.getId())
                        .isPresent()
                : opportunity.getCreatedBy() != null && opportunity.getCreatedBy().getId().equals(actor.getId());
        if (!owner) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You do not have access to this listing.");
        }
        OpportunityStatus target;
        switch (opportunity.getStatus()) {
            case PUBLISHED -> target = OpportunityStatus.CLOSED;
            case DRAFT, PENDING_REVIEW, APPROVED, SCHEDULED -> target = OpportunityStatus.ARCHIVED;
            default -> throw new BadRequestException("A " + opportunity.getStatus() + " listing cannot be closed.");
        }
        opportunity.setStatus(target);
        auditService.record(
                actor,
                target == OpportunityStatus.CLOSED ? "CLOSED_BY_OWNER" : "WITHDRAWN_BY_OWNER",
                "Opportunity",
                opportunity.getReference(),
                (target == OpportunityStatus.CLOSED ? "Closed" : "Withdrew") + " \"" + opportunity.getTitle() + "\"");
        return OpportunityDetailResponse.from(opportunity);
    }

    /** Puts a closed or archived listing back into the draft-to-review flow so it can be corrected and re-approved. */
    @Transactional
    public OpportunityDetailResponse reopen(java.util.UUID id, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (opportunity.getStatus() != OpportunityStatus.CLOSED
                && opportunity.getStatus() != OpportunityStatus.ARCHIVED
                && opportunity.getStatus() != OpportunityStatus.EXPIRED) {
            throw new BadRequestException("Opportunity is " + opportunity.getStatus() + ", only closed, archived or expired listings can be reopened.");
        }
        opportunity.setStatus(OpportunityStatus.PENDING_REVIEW);
        auditService.record(
                actor, "REOPENED", "Opportunity", opportunity.getReference(), "Reopened \"" + opportunity.getTitle() + "\" for review");
        notifyCreator(opportunity, "OPPORTUNITY_REOPENED", "Your listing was reopened",
                "\"" + opportunity.getTitle() + "\" (" + opportunity.getReference() + ") was reopened and is back in the review queue.");
        return OpportunityDetailResponse.from(opportunity);
    }

    /** Counts a click on the official application route. Only live listings count; unknown ids are ignored. */
    @Transactional
    public void recordApplyClick(java.util.UUID id) {
        opportunityRepository.incrementApplyClicks(id);
    }

    @Transactional
    public void recordShare(java.util.UUID id) {
        opportunityRepository.incrementShares(id);
    }

    /** Adds or removes a listing from the home page's featured strip. Only listings that are or will be live qualify. */
    @Transactional
    public OpportunityDetailResponse setFeatured(java.util.UUID id, boolean featured, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (featured && !List.of(OpportunityStatus.PUBLISHED, OpportunityStatus.SCHEDULED, OpportunityStatus.APPROVED)
                .contains(opportunity.getStatus())) {
            throw new BadRequestException("Only approved, scheduled or published listings can be featured.");
        }
        if (opportunity.isFeatured() != featured) {
            opportunity.setFeatured(featured);
            auditService.record(actor, featured ? "FEATURED" : "UNFEATURED", "Opportunity", opportunity.getReference(),
                    (featured ? "Featured \"" : "Removed from featured: \"") + opportunity.getTitle() + "\"");
        }
        return OpportunityDetailResponse.from(opportunity);
    }

    /**
     * Authorised deadline extension. Requires a reason, which is written to the audit log. A listing that already
     * closed or expired at its old deadline goes live again with the new one.
     */
    @Transactional
    public OpportunityDetailResponse extendDeadline(java.util.UUID id, Instant newDeadline, String reason, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (reason == null || reason.trim().length() < 5) {
            throw new BadRequestException("Give a reason for the extension (at least 5 characters).");
        }
        if (newDeadline == null || !newDeadline.isAfter(Instant.now())) {
            throw new BadRequestException("The new deadline must be in the future.");
        }
        if (opportunity.getDeadline() != null && !newDeadline.isAfter(opportunity.getDeadline())) {
            throw new BadRequestException("The new deadline must be later than the current one.");
        }
        OpportunityStatus status = opportunity.getStatus();
        if (!List.of(OpportunityStatus.PUBLISHED, OpportunityStatus.SCHEDULED, OpportunityStatus.APPROVED,
                        OpportunityStatus.CLOSED, OpportunityStatus.EXPIRED)
                .contains(status)) {
            throw new BadRequestException("A " + status + " listing cannot have its deadline extended.");
        }
        Instant previous = opportunity.getDeadline();
        opportunity.setDeadline(newDeadline);
        boolean relisted = status == OpportunityStatus.CLOSED || status == OpportunityStatus.EXPIRED;
        if (relisted) {
            opportunity.setStatus(OpportunityStatus.PUBLISHED);
        }
        auditService.record(actor, "DEADLINE_EXTENDED", "Opportunity", opportunity.getReference(),
                "Deadline " + (previous != null ? previous : "none") + " -> " + newDeadline
                        + (relisted ? " (re-published)" : "") + ". Reason: " + reason.trim());
        notifyCreator(opportunity, "OPPORTUNITY_DEADLINE_EXTENDED", "Your listing's deadline was extended",
                "\"" + opportunity.getTitle() + "\" (" + opportunity.getReference() + ") now closes on " + newDeadline
                        + (relisted ? " and is live again." : "."));
        return OpportunityDetailResponse.from(opportunity);
    }

    /**
     * Copies a listing into a new submission (new reference, no deadline) for its owner or staff, e.g. to re-run
     * a vacancy that closed. The copy goes to review and is marked as related to the original so moderators see it.
     */
    @Transactional
    public OpportunityDetailResponse renew(java.util.UUID id, User actor) {
        Opportunity source =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (!canManage(source, actor)) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You do not have access to this listing.");
        }
        Opportunity copy = new Opportunity();
        copy.setReference(referenceNumberService.next("EOZ-OPP"));
        copy.setSlug(slugify(source.getTitle()));
        copy.setTitle(source.getTitle());
        copy.setCategory(source.getCategory());
        copy.setOrganisation(source.getOrganisation());
        copy.setOrganisationName(source.getOrganisationName());
        copy.setDescription(source.getDescription());
        copy.setResponsibilities(source.getResponsibilities());
        copy.setRequirements(source.getRequirements());
        copy.setBenefits(source.getBenefits());
        copy.setLocation(source.getLocation());
        copy.setRegion(source.getRegion());
        copy.setWorkMode(source.getWorkMode());
        copy.setEmploymentType(source.getEmploymentType());
        copy.setWorkArrangement(source.getWorkArrangement());
        copy.setExperienceLevel(source.getExperienceLevel());
        copy.setOpportunityValue(source.getOpportunityValue());
        copy.setOpportunityValueUnit(source.getOpportunityValueUnit());
        copy.setSalaryMin(source.getSalaryMin());
        copy.setSalaryMax(source.getSalaryMax());
        copy.setSalaryVisible(source.isSalaryVisible());
        copy.setCurrency(source.getCurrency());
        copy.setSlots(source.getSlots());
        copy.setApplicationMode(source.getApplicationMode());
        copy.setApplicationUrl(source.getApplicationUrl());
        copy.setApplicationEmail(source.getApplicationEmail());
        copy.setApplicationAddress(source.getApplicationAddress());
        copy.setSource(source.getSource());
        copy.setStatus(OpportunityStatus.PENDING_REVIEW);
        copy.setCreatedBy(actor);
        copy.setFlaggedDuplicateOf(source);
        copy = opportunityRepository.save(copy);
        auditService.record(actor, "RENEWED", "Opportunity", copy.getReference(),
                "Renewed from " + source.getReference() + " as a new submission");
        return OpportunityDetailResponse.from(copy);
    }

    @Transactional
    public OpportunityDetailResponse archive(java.util.UUID id, User actor) {
        Opportunity opportunity =
                opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
        if (opportunity.getStatus() == OpportunityStatus.ARCHIVED) {
            throw new BadRequestException("Opportunity is already archived.");
        }
        opportunity.setStatus(OpportunityStatus.ARCHIVED);
        auditService.record(
                actor, "ARCHIVED", "Opportunity", opportunity.getReference(), "Archived \"" + opportunity.getTitle() + "\"");
        notifyCreator(opportunity, "OPPORTUNITY_ARCHIVED", "Your listing was archived",
                "\"" + opportunity.getTitle() + "\" (" + opportunity.getReference() + ") has been archived by staff and removed from the public board.");
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
    private void validateApplicationRoute(ApplicationMode mode, String url, String email, String address) {
        switch (mode) {
            case EXTERNAL_URL -> {
                if (url == null || url.isBlank()) {
                    throw new BadRequestException("Add the application link, or choose another way for candidates to apply.");
                }
            }
            case EMPLOYER_EMAIL -> {
                if (email == null || email.isBlank()) {
                    throw new BadRequestException("Add the email address applications go to, or choose another way for candidates to apply.");
                }
            }
            case PHYSICAL_ADDRESS -> {
                if (address == null || address.isBlank()) {
                    throw new BadRequestException(
                            "Add the address applications are delivered to, or choose another way for candidates to apply.");
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
