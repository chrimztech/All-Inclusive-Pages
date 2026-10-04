package zm.eoz.platform.information;

import jakarta.validation.Valid;
import java.util.UUID;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.information.dto.InformationArticleRequest;
import zm.eoz.platform.information.dto.InformationArticleResponse;
import zm.eoz.platform.security.UserPrincipal;

@RestController
public class InformationHubController {

    private final InformationHubService service;
    private final UserRepository userRepository;

    public InformationHubController(InformationHubService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @GetMapping("/api/v1/information-hub")
    public ApiResponse<PageResponse<InformationArticleResponse>> published(
            @RequestParam(required = false) String category,
            @RequestParam(required = false, name = "q") String query,
            Pageable pageable) {
        return ApiResponse.of(PageResponse.from(service.published(category, query, pageable)));
    }

    @GetMapping("/api/v1/information-hub/{slug}")
    public ApiResponse<InformationArticleResponse> publishedBySlug(@PathVariable String slug) {
        return ApiResponse.of(service.publishedBySlug(slug));
    }

    @GetMapping("/api/v1/admin/information-hub")
    @PreAuthorize("hasAuthority('CONTENT_MANAGE')")
    public ApiResponse<PageResponse<InformationArticleResponse>> adminList(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(service.adminList(pageable)));
    }

    @PostMapping("/api/v1/admin/information-hub")
    @PreAuthorize("hasAuthority('CONTENT_MANAGE')")
    public ApiResponse<InformationArticleResponse> create(@Valid @RequestBody InformationArticleRequest request) {
        return ApiResponse.of(service.create(request, currentUser()));
    }

    @PatchMapping("/api/v1/admin/information-hub/{id}")
    @PreAuthorize("hasAuthority('CONTENT_MANAGE')")
    public ApiResponse<InformationArticleResponse> update(
            @PathVariable UUID id, @Valid @RequestBody InformationArticleRequest request) {
        return ApiResponse.of(service.update(id, request, currentUser()));
    }

    @PostMapping("/api/v1/admin/information-hub/{id}/publish")
    @PreAuthorize("hasAuthority('CONTENT_MANAGE')")
    public ApiResponse<InformationArticleResponse> publish(@PathVariable UUID id) {
        return ApiResponse.of(service.publish(id, currentUser()));
    }

    @PostMapping("/api/v1/admin/information-hub/{id}/unpublish")
    @PreAuthorize("hasAuthority('CONTENT_MANAGE')")
    public ApiResponse<InformationArticleResponse> unpublish(@PathVariable UUID id) {
        return ApiResponse.of(service.unpublish(id, currentUser()));
    }

    @DeleteMapping("/api/v1/admin/information-hub/{id}")
    @PreAuthorize("hasAuthority('CONTENT_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id, currentUser());
        return ResponseEntity.noContent().build();
    }

    private User currentUser() {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
