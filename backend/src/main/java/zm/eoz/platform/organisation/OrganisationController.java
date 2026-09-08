package zm.eoz.platform.organisation;

import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
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
import zm.eoz.platform.security.UserPrincipal;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organisations")
public class OrganisationController {

    private final OrganisationRepository organisationRepository;
    private final OrganisationService organisationService;
    private final UserRepository userRepository;
    private final OpportunityRepository opportunityRepository;

    public OrganisationController(
            OrganisationRepository organisationRepository,
            OrganisationService organisationService,
            UserRepository userRepository,
            OpportunityRepository opportunityRepository) {
        this.organisationRepository = organisationRepository;
        this.organisationService = organisationService;
        this.userRepository = userRepository;
        this.opportunityRepository = opportunityRepository;
    }

    @GetMapping
    public ApiResponse<PageResponse<OrganisationResponse>> list(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(organisationRepository
                .findAll(pageable)
                .map(org -> OrganisationResponse.from(
                        org, opportunityRepository.countByOrganisationIdAndStatus(org.getId(), OpportunityStatus.PUBLISHED)))));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrganisationResponse> get(@PathVariable UUID id) {
        var org = organisationRepository
                .findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found: " + id));
        return ApiResponse.of(OrganisationResponse.from(
                org, opportunityRepository.countByOrganisationIdAndStatus(id, OpportunityStatus.PUBLISHED)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLOYER','ADMIN')")
    public ApiResponse<OrganisationResponse> register(@Valid @RequestBody OrganisationCreateRequest request) {
        return ApiResponse.of(organisationService.register(request, currentUser()));
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<OrganisationResponse>> mine() {
        return ApiResponse.of(organisationService.listMine(currentUser()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<OrganisationResponse> update(
            @PathVariable UUID id, @Valid @RequestBody OrganisationUpdateRequest request) {
        return ApiResponse.of(organisationService.update(id, request, currentUser()));
    }

    @PatchMapping("/{id}/verification")
    @PreAuthorize("hasAuthority('ORGANISATION_VERIFY')")
    public ApiResponse<OrganisationResponse> decide(
            @PathVariable UUID id, @Valid @RequestBody VerificationDecisionRequest request) {
        return ApiResponse.of(organisationService.decide(id, request, currentUser()));
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<MemberResponse>> listMembers(@PathVariable UUID id) {
        return ApiResponse.of(organisationService.listMembers(id, currentUser()));
    }

    @PostMapping("/{id}/members")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<MemberResponse> inviteMember(@PathVariable UUID id, @Valid @RequestBody MemberInviteRequest request) {
        return ApiResponse.of(organisationService.inviteMember(id, request, currentUser()));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeMember(@PathVariable UUID id, @PathVariable UUID userId) {
        organisationService.removeMember(id, userId, currentUser());
        return ResponseEntity.noContent().build();
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
