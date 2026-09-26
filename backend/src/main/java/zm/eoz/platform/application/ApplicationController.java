package zm.eoz.platform.application;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.application.dto.ApplicationRequest;
import zm.eoz.platform.application.dto.ApplicationResponse;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;
import zm.eoz.platform.storage.FileAsset;
import zm.eoz.platform.storage.FileStorageService;

@RestController
public class ApplicationController {

    private final ApplicationService applicationService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    public ApplicationController(
            ApplicationService applicationService, UserRepository userRepository, FileStorageService fileStorageService) {
        this.applicationService = applicationService;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/api/v1/opportunities/{opportunityId}/applications")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ApiResponse<ApplicationResponse> apply(
            @PathVariable UUID opportunityId, @RequestBody ApplicationRequest request) {
        return ApiResponse.of(applicationService.apply(opportunityId, request, currentUser()));
    }

    @GetMapping("/api/v1/candidate/applications")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ApiResponse<List<ApplicationResponse>> mine() {
        return ApiResponse.of(applicationService.listMine(currentUser().getId()));
    }

    /** Employer/staff view of applicants for one of their EOZ-hosted opportunities. */
    @GetMapping("/api/v1/opportunities/{opportunityId}/applications")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<ApplicationResponse>> forOpportunity(@PathVariable UUID opportunityId) {
        return ApiResponse.of(applicationService.listForOpportunity(opportunityId, currentUser()));
    }

    @PatchMapping("/api/v1/applications/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ApplicationResponse> updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusUpdateRequest request) {
        return ApiResponse.of(applicationService.updateStatus(id, request.status(), currentUser()));
    }

    @GetMapping("/api/v1/admin/applications")
    @PreAuthorize("hasAuthority('APPLICATION_MANAGE')")
    public ApiResponse<zm.eoz.platform.common.PageResponse<ApplicationResponse>> adminList(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String status,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String q,
            org.springframework.data.domain.Pageable pageable) {
        return ApiResponse.of(zm.eoz.platform.common.PageResponse.from(applicationService.searchAll(status, q, pageable)));
    }

    @PostMapping("/api/v1/candidate/applications/{id}/withdraw")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ApplicationResponse> withdraw(@PathVariable UUID id) {
        return ApiResponse.of(applicationService.withdraw(id, currentUser()));
    }

    public record StatusUpdateRequest(@jakarta.validation.constraints.NotBlank String status) {}

    /** CV download, scoped to the applying candidate, the receiving organisation's members, or staff. */
    @GetMapping("/api/v1/applications/{id}/resume")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> resume(@PathVariable UUID id) {
        UUID fileId = applicationService.authoriseResumeAccess(id, currentUser());
        FileAsset asset = fileStorageService.get(fileId);
        Resource resource = fileStorageService.load(asset);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(asset.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + asset.getFileName() + "\"")
                .body(resource);
    }

    private zm.eoz.platform.identity.User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
