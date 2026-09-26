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
import zm.eoz.platform.storage.FileAsset;
import zm.eoz.platform.storage.FileStorageService;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organisations")
public class OrganisationController {

    private final OrganisationRepository organisationRepository;
    private final OrganisationService organisationService;
    private final UserRepository userRepository;
    private final OpportunityRepository opportunityRepository;
    private final FileStorageService fileStorageService;

    public OrganisationController(
            OrganisationRepository organisationRepository,
            OrganisationService organisationService,
            UserRepository userRepository,
            OpportunityRepository opportunityRepository,
            FileStorageService fileStorageService) {
        this.organisationRepository = organisationRepository;
        this.organisationService = organisationService;
        this.userRepository = userRepository;
        this.opportunityRepository = opportunityRepository;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Public directory. {@code order=top} ranks organisations by live listings (top recruiters) and is the
     * default; {@code newest} and {@code name} are also accepted. {@code q} matches name, sector or location.
     */
    @GetMapping
    public ApiResponse<PageResponse<OrganisationResponse>> list(
            @RequestParam(defaultValue = "top") String order,
            @RequestParam(defaultValue = "false") boolean verifiedOnly,
            @RequestParam(required = false) String q,
            Pageable pageable) {
        String normalizedOrder = order.toLowerCase(java.util.Locale.ROOT);
        if (!List.of("top", "newest", "name").contains(normalizedOrder)) {
            throw new zm.eoz.platform.common.exception.BadRequestException(
                    "Unknown order: " + order + ". Use top, newest or name.");
        }
        String pattern = q == null || q.isBlank()
                ? "%"
                : "%" + q.trim().toLowerCase(java.util.Locale.ROOT).replace("%", "\\%").replace("_", "\\_") + "%";
        Pageable unsorted = org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return ApiResponse.of(PageResponse.from(organisationRepository
                .directory(normalizedOrder, verifiedOnly, pattern, unsorted)
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

    @PatchMapping("/{id}/logo")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<OrganisationResponse> setLogo(@PathVariable UUID id, @Valid @RequestBody SetLogoRequest request) {
        return ApiResponse.of(organisationService.setLogo(id, request.fileId(), currentUser()));
    }

    /**
     * Unauthenticated by design (falls under the permitAll "/api/v1/organisations/**" matcher) — an
     * organisation's logo is public data shown on its listing/profile pages to anonymous visitors, unlike
     * other files behind {@code FileStorageService.getForDownload}'s uploader-or-staff restriction.
     */
    @GetMapping("/{id}/logo")
    public ResponseEntity<Resource> logo(@PathVariable UUID id) {
        var org = organisationRepository
                .findById(id)
                .orElseThrow(() -> new NotFoundException("Organisation not found: " + id));
        if (org.getLogoFileId() == null) {
            throw new NotFoundException("Organisation has no logo.");
        }
        FileAsset asset = fileStorageService.get(org.getLogoFileId());
        Resource resource = fileStorageService.load(asset);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(asset.getContentType()))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .body(resource);
    }

    public record SetLogoRequest(@jakarta.validation.constraints.NotNull UUID fileId) {}

    public record EvidenceResponse(UUID id, String fileName, String contentType, long sizeBytes, java.time.Instant uploadedAt,
            String uploadedByName) {
        static EvidenceResponse from(FileAsset a) {
            return new EvidenceResponse(a.getId(), a.getFileName(), a.getContentType(), a.getSizeBytes(), a.getUploadedAt(),
                    a.getUploadedBy() != null ? a.getUploadedBy().getFullName() : null);
        }
    }

    @GetMapping("/{id}/verification-reviews")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<OrganisationService.ReviewView>> reviews(@PathVariable UUID id) {
        return ApiResponse.of(organisationService.reviews(id, currentUser()));
    }

    @GetMapping("/{id}/verification-documents")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EvidenceResponse>> evidence(@PathVariable UUID id) {
        return ApiResponse.of(organisationService.listEvidence(id, currentUser()).stream().map(EvidenceResponse::from).toList());
    }

    @PostMapping(value = "/{id}/verification-documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<EvidenceResponse> addEvidence(
            @PathVariable UUID id, @org.springframework.web.bind.annotation.RequestParam("file")
                    org.springframework.web.multipart.MultipartFile file) {
        return ApiResponse.of(EvidenceResponse.from(organisationService.addEvidence(id, file, currentUser())));
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
