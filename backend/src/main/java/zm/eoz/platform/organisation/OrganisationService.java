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

    public OrganisationService(
            OrganisationRepository organisationRepository,
            OrganisationVerificationReviewRepository reviewRepository,
            OrganisationMemberRepository memberRepository,
            UserRepository userRepository,
            AuditService auditService,
            OpportunityRepository opportunityRepository) {
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
        org.setSector(request.sector());
        org.setWebsite(request.website());
        org.setAddress(request.address());
        org.setDescription(request.description());
        organisationRepository.save(org);
        auditService.record(
                actor, "UPDATED", "Organisation", organisationId.toString(), "Updated profile for \"" + org.getLegalName() + "\"");
        return OrganisationResponse.from(
                org, opportunityRepository.countByOrganisationIdAndStatus(organisationId, OpportunityStatus.PUBLISHED));
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
