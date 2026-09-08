package zm.eoz.platform.content;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.content.dto.ContentItemRequest;
import zm.eoz.platform.content.dto.ContentItemResponse;
import zm.eoz.platform.content.dto.ContentVariantResponse;
import zm.eoz.platform.content.dto.ScheduleRequest;
import zm.eoz.platform.content.dto.VariantUpsertRequest;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/admin/content")
@PreAuthorize("hasAuthority('CONTENT_MANAGE')")
public class ContentController {

    private final ContentService contentService;
    private final UserRepository userRepository;

    public ContentController(ContentService contentService, UserRepository userRepository) {
        this.contentService = contentService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ApiResponse<ContentItemResponse> create(@Valid @RequestBody ContentItemRequest request) {
        return ApiResponse.of(contentService.create(request, currentUser()));
    }

    @GetMapping
    public ApiResponse<PageResponse<ContentItemResponse>> list(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(contentService.list(pageable)));
    }

    @GetMapping("/{id}")
    public ApiResponse<ContentItemResponse> get(@PathVariable UUID id) {
        return ApiResponse.of(contentService.get(id));
    }

    @PostMapping("/{id}/submit")
    public ApiResponse<ContentItemResponse> submit(@PathVariable UUID id) {
        return ApiResponse.of(contentService.transition(id, ContentItem.Status.PENDING_REVIEW, currentUser()));
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<ContentItemResponse> approve(@PathVariable UUID id) {
        return ApiResponse.of(contentService.transition(id, ContentItem.Status.APPROVED, currentUser()));
    }

    @PostMapping("/{id}/schedule")
    public ApiResponse<ContentItemResponse> schedule(@PathVariable UUID id, @Valid @RequestBody ScheduleRequest request) {
        return ApiResponse.of(contentService.schedule(id, request.scheduledAt(), currentUser()));
    }

    @PostMapping("/{id}/publish")
    public ApiResponse<ContentItemResponse> publish(@PathVariable UUID id) {
        return ApiResponse.of(contentService.transition(id, ContentItem.Status.PUBLISHED, currentUser()));
    }

    @PostMapping("/{id}/variants")
    public ApiResponse<ContentVariantResponse> upsertVariant(@PathVariable UUID id, @Valid @RequestBody VariantUpsertRequest request) {
        return ApiResponse.of(contentService.upsertVariant(id, request, currentUser()));
    }

    @PostMapping("/{id}/variants/generate")
    public ApiResponse<ContentVariantResponse> generateVariant(@PathVariable UUID id, @RequestParam String channel) {
        return ApiResponse.of(contentService.generateVariant(id, channel, currentUser()));
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
