package zm.eoz.platform.organisation;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.ForbiddenException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.opportunity.OpportunityRepository;
import zm.eoz.platform.opportunity.OpportunityStatus;
import zm.eoz.platform.organisation.dto.MemberInviteRequest;
import zm.eoz.platform.organisation.dto.MemberResponse;
import zm.eoz.platform.organisation.dto.OrganisationCreateRequest;
import zm.eoz.platform.organisation.dto.OrganisationResponse;
import zm.eoz.platform.organisation.dto.OrganisationUpdateRequest;
import zm.eoz.platform.organisation.dto.VerificationDecisionRequest;

@Service
public class OrganisationService {

    private final OrganisationRepository organisationRepository;
    private final OrganisationVerificationReviewRepository reviewRepository;
    private final OrganisationMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final OpportunityRepository opportunityRepository;

    /** file_assets owner type for verification evidence (registration certificates, TPIN letters, ...). */
    public static final String EVIDENCE_OWNER_TYPE = "ORGANISATION_VERIFICATION";

    private final zm.eoz.platform.storage.FileStorageService fileStorageService;

    public OrganisationService(
            OrganisationRepository organisationRepository,
            OrganisationVerificationReviewRepository reviewRepository,
            OrganisationMemberRepository memberRepository,
            UserRepository userRepository,
            AuditService auditService,
            OpportunityRepository opportunityRepository,
            zm.eoz.platform.storage.FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
        this.organisationRepository = organisationRepository;
        this.reviewRepository = reviewRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.opportunityRepository = opportunityRepository;
    }

    @Transactional
    public OrganisationResponse register(OrganisationCreateRequest request, User createdBy) {
        Organisation org = new Organisation();
        org.setLegalName(request.legalName());
        org.setTradingName(request.tradingName());
        org.setRegistrationNumber(request.registrationNumber());
        org.setSector(request.sector());
        org.setSize(request.size());
        org.setWebsite(request.website());
        org.setAddress(request.address());
        org.setBusinessType(parseBusinessType(request.businessType()));
        org.setSizeBand(parseSizeBand(request.sizeBand()));
        org.setTpin(request.tpin());
        org.setFoundedYear(request.foundedYear());
        org.setContactPersonName(request.contactPersonName());
        org.setContactPersonRole(request.contactPersonRole());
        org.setContactPhone(request.contactPhone());
        org.setLinkedinUrl(request.linkedinUrl());
        org.setFacebookUrl(request.facebookUrl());
        org.setCreatedBy(createdBy);
        org.setVerificationStatus(VerificationStatus.PENDING);
        org = organisationRepository.save(org);

        OrganisationMember owner = new OrganisationMember(org, createdBy);
        owner.setRoleInOrg(OrganisationMember.RoleInOrg.OWNER);
        owner.setStatus(OrganisationMember.Status.ACTIVE);
        memberRepository.save(owner);

        auditService.record(
                createdBy, "REGISTERED", "Organisation", org.getId().toString(), "Registered \"" + org.getLegalName() + "\"");
        return OrganisationResponse.from(org, 0);
    }

    @Transactional(readOnly = true)
    public List<OrganisationResponse> listMine(User actor) {
        return memberRepository.findById_UserId(actor.getId()).stream()
                .map(m -> OrganisationResponse.from(
                        m.getOrganisation(),
                        opportunityRepository.countByOrganisationIdAndStatus(
                                m.getOrganisation().getId(), OpportunityStatus.PUBLISHED)))
                .toList();
    }

    @Transactional
    public OrganisationResponse update(UUID organisationId, OrganisationUpdateRequest request, User actor) {
        requireMemberAccess(organisationId, actor);
        Organisation org = requireOrganisation(organisationId);
        org.setLegalName(request.legalName());
        org.setTradingName(request.tradingName());
        org.setRegistrationNumber(request.registrationNumber());
        org.setSector(request.sector());
        org.setSize(request.size());
        org.setWebsite(request.website());
        org.setAddress(request.address());
        org.setDescription(request.description());
        org.setBusinessType(parseBusinessType(request.businessType()));
        org.setSizeBand(parseSizeBand(request.sizeBand()));
        org.setTpin(request.tpin());
        org.setFoundedYear(request.foundedYear());
        org.setContactPersonName(request.contactPersonName());
        org.setContactPersonRole(request.contactPersonRole());
        org.setContactPhone(request.contactPhone());
        org.setLinkedinUrl(request.linkedinUrl());
        org.setFacebookUrl(request.facebookUrl());
        organisationRepository.save(org);
        auditService.record(
                actor, "UPDATED", "Organisation", organisationId.toString(), "Updated profile for \"" + org.getLegalName() + "\"");
        return OrganisationResponse.from(
                org, opportunityRepository.countByOrganisationIdAndStatus(organisationId, OpportunityStatus.PUBLISHED));
    }

    @Transactional
    public OrganisationResponse setLogo(UUID organisationId, UUID logoFileId, User actor) {
        requireMemberAccess(organisationId, actor);
        Organisation org = requireOrganisation(organisationId);
        org.setLogoFileId(logoFileId);
        organisationRepository.save(org);
        auditService.record(actor, "LOGO_UPDATED", "Organisation", organisationId.toString(), "Updated logo for \"" + org.getLegalName() + "\"");
        return OrganisationResponse.from(
                org, opportunityRepository.countByOrganisationIdAndStatus(organisationId, OpportunityStatus.PUBLISHED));
    }

    private BusinessType parseBusinessType(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return BusinessType.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown business type: " + value);
        }
    }

    private OrganisationSizeBand parseSizeBand(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OrganisationSizeBand.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown size band: " + value);
        }
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(UUID organisationId, User actor) {
        requireMemberAccess(organisationId, actor);
        return memberRepository.findById_OrganisationId(organisationId).stream().map(MemberResponse::from).toList();
    }

    @Transactional
    public MemberResponse inviteMember(UUID organisationId, MemberInviteRequest request, User actor) {
        requireOwnerAccess(organisationId, actor);
        Organisation org = requireOrganisation(organisationId);
        User invitee = userRepository
                .findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new NotFoundException(
                        "No EOZ account found for " + request.email() + " — they must register first."));
        if (memberRepository.findById_OrganisationIdAndId_UserId(organisationId, invitee.getId()).isPresent()) {
            throw new ConflictException(request.email() + " is already a member of this organisation.");
        }
        OrganisationMember.RoleInOrg role = OrganisationMember.RoleInOrg.MEMBER;
        if (request.roleInOrg() != null) {
            try {
                role = OrganisationMember.RoleInOrg.valueOf(request.roleInOrg());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown role: " + request.roleInOrg());
            }
        }
        OrganisationMember member = new OrganisationMember(org, invitee);
        member.setRoleInOrg(role);
        member.setStatus(OrganisationMember.Status.INVITED);
        member = memberRepository.save(member);
        auditService.record(
                actor, "MEMBER_INVITED", "Organisation", organisationId.toString(), "Invited " + request.email() + " as " + role);
        return MemberResponse.from(member);
    }

    @Transactional
    public void removeMember(UUID organisationId, UUID userId, User actor) {
        requireOwnerAccess(organisationId, actor);
        OrganisationMember member = memberRepository
                .findById_OrganisationIdAndId_UserId(organisationId, userId)
                .orElseThrow(() -> new NotFoundException("Membership not found."));
        if (member.getRoleInOrg() == OrganisationMember.RoleInOrg.OWNER) {
            throw new BadRequestException("The organisation owner cannot be removed.");
        }
        memberRepository.delete(member);
        auditService.record(actor, "MEMBER_REMOVED", "Organisation", organisationId.toString(), "Removed member " + userId);
    }

    public record ReviewView(String decision, String notes, String reviewerName, java.time.Instant reviewedAt) {}

    /** Verification decisions with reviewer notes, newest first — visible to members and reviewers. */
    @Transactional(readOnly = true)
    public List<ReviewView> reviews(UUID organisationId, User actor) {
        requireOrganisation(organisationId);
        boolean reviewer = hasPermission(actor, "ORGANISATION_VERIFY");
        boolean member = memberRepository.findById_OrganisationIdAndId_UserId(organisationId, actor.getId()).isPresent();
        if (!reviewer && !member) {
            throw new ForbiddenException("You are not a member of this organisation.");
        }
        return reviewRepository.findByOrganisationIdOrderByReviewedAtDesc(organisationId).stream()
                .map(r -> new ReviewView(
                        r.getDecision().name(),
                        r.getNotes(),
                        r.getReviewer() != null ? r.getReviewer().getFullName() : null,
                        r.getReviewedAt()))
                .toList();
    }

    /** Evidence is visible to the organisation's own members and to verification reviewers. */
    @Transactional(readOnly = true)
    public List<zm.eoz.platform.storage.FileAsset> listEvidence(UUID organisationId, User actor) {
        requireOrganisation(organisationId);
        boolean reviewer = hasPermission(actor, "ORGANISATION_VERIFY");
        boolean member = memberRepository.findById_OrganisationIdAndId_UserId(organisationId, actor.getId()).isPresent();
        if (!reviewer && !member) {
            throw new ForbiddenException("You are not a member of this organisation.");
        }
        return fileStorageService.listForOwner(EVIDENCE_OWNER_TYPE, organisationId.toString());
    }

    /**
     * Adds a verification document. Submitting evidence moves a pending or rejected organisation to UNDER_REVIEW so
     * it shows up for reviewers; verified and suspended organisations keep their status.
     */
    @Transactional
    public zm.eoz.platform.storage.FileAsset addEvidence(
            UUID organisationId, org.springframework.web.multipart.MultipartFile file, User actor) {
        Organisation org = requireOrganisation(organisationId);
        if (memberRepository.findById_OrganisationIdAndId_UserId(organisationId, actor.getId()).isEmpty()) {
            throw new ForbiddenException("Only members of this organisation can submit its verification documents.");
        }
        var asset = fileStorageService.store(file, EVIDENCE_OWNER_TYPE, organisationId.toString(), actor);
        VerificationStatus status = org.getVerificationStatus();
        if (status == VerificationStatus.PENDING || status == VerificationStatus.REJECTED) {
            org.setVerificationStatus(VerificationStatus.UNDER_REVIEW);
        }
        auditService.record(actor, "VERIFICATION_EVIDENCE_ADDED", "Organisation", organisationId.toString(),
                "Uploaded " + asset.getFileName() + (status != org.getVerificationStatus() ? " (now under review)" : ""));
        return asset;
    }

    private static boolean hasPermission(User actor, String code) {
        return actor.getRoles().stream().flatMap(r -> r.getPermissions().stream()).anyMatch(p -> code.equals(p.getCode()));
    }

    private void requireMemberAccess(UUID organisationId, User actor) {
        boolean isStaff = actor.getRoles().stream().anyMatch(r -> Set.of("MANAGER", "ADMIN").contains(r.getName()));
        boolean isMember = memberRepository.findById_OrganisationIdAndId_UserId(organisationId, actor.getId()).isPresent();
        if (!isStaff && !isMember) {
            throw new ForbiddenException("You are not a member of this organisation.");
        }
    }

    private void requireOwnerAccess(UUID organisationId, User actor) {
        boolean isStaff = actor.getRoles().stream().anyMatch(r -> Set.of("MANAGER", "ADMIN").contains(r.getName()));
        boolean isOwner = memberRepository
                .findById_OrganisationIdAndId_UserId(organisationId, actor.getId())
                .map(m -> m.getRoleInOrg() == OrganisationMember.RoleInOrg.OWNER)
                .orElse(false);
        if (!isStaff && !isOwner) {
            throw new ForbiddenException("Only the organisation owner can manage team access.");
        }
    }

    private Organisation requireOrganisation(UUID id) {
        return organisationRepository.findById(id).orElseThrow(() -> new NotFoundException("Organisation not found: " + id));
    }

    @Transactional
    public OrganisationResponse decide(java.util.UUID id, VerificationDecisionRequest request, User reviewer) {
        Organisation org = organisationRepository
                .findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found: " + id));

        VerificationStatus decision;
        try {
            decision = VerificationStatus.valueOf(request.decision());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown decision: " + request.decision());
        }
        if (decision == VerificationStatus.PENDING) {
            throw new BadRequestException("PENDING is not a valid review decision.");
        }

        org.setVerificationStatus(decision);
        organisationRepository.save(org);

        OrganisationVerificationReview review = new OrganisationVerificationReview();
        review.setOrganisation(org);
        review.setReviewer(reviewer);
        review.setDecision(decision);
        review.setNotes(request.notes());
        reviewRepository.save(review);

        auditService.record(
                reviewer,
                "VERIFICATION_" + decision,
                "Organisation",
                org.getId().toString(),
                "Set \"" + org.getLegalName() + "\" to " + decision);
        return OrganisationResponse.from(
                org, opportunityRepository.countByOrganisationIdAndStatus(org.getId(), OpportunityStatus.PUBLISHED));
    }
}
