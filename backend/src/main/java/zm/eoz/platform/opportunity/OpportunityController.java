package zm.eoz.platform.opportunity;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.opportunity.dto.ModerationActionRequest;
import zm.eoz.platform.opportunity.dto.OpportunityCreateRequest;
import zm.eoz.platform.opportunity.dto.OpportunityDetailResponse;
import zm.eoz.platform.opportunity.dto.OpportunityModerationSummary;
import zm.eoz.platform.opportunity.dto.OpportunitySummaryResponse;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/opportunities")
public class OpportunityController {

    private final OpportunityService opportunityService;
    private final UserRepository userRepository;

    public OpportunityController(OpportunityService opportunityService, UserRepository userRepository) {
        this.opportunityService = opportunityService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<PageResponse<OpportunitySummaryResponse>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean verifiedOnly,
            @RequestParam(required = false) Integer deadlineWithinDays,
            @RequestParam(required = false) UUID organisationId,
            @RequestParam(required = false) String employmentType,
            @RequestParam(required = false) String workArrangement,
            @RequestParam(required = false) String experienceLevel,
            @RequestParam(required = false) String order,
            Pageable pageable) {
        return ApiResponse.of(PageResponse.from(opportunityService.search(
                category, region, q, verifiedOnly, deadlineWithinDays, organisationId, employmentType, workArrangement,
                experienceLevel, order, pageable)));
    }

    @GetMapping("/{slug}")
    public ApiResponse<OpportunityDetailResponse> get(@PathVariable String slug) {
        return ApiResponse.of(opportunityService.getBySlug(slug));
    }

    @PostMapping
    @PreAuthorize("hasRole('EMPLOYER') or hasAuthority('OPPORTUNITY_CREATE')")
    public ApiResponse<OpportunityDetailResponse> create(@Valid @RequestBody OpportunityCreateRequest request) {
        return ApiResponse.of(opportunityService.create(request, currentUser()));
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<zm.eoz.platform.opportunity.dto.EmployerOpportunitySummary>> mine(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(opportunityService.myListings(currentUser(), pageable)));
    }

    @GetMapping("/mine/stats")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<zm.eoz.platform.opportunity.dto.EmployerOpportunityStats> mineStats() {
        return ApiResponse.of(opportunityService.myListingsStats(currentUser()));
    }

    @GetMapping("/mine/analytics")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<zm.eoz.platform.opportunity.dto.EmployerAnalyticsSummary> mineAnalytics() {
        return ApiResponse.of(opportunityService.myAnalytics(currentUser()));
    }

    @GetMapping("/moderation/queue")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<PageResponse<OpportunityModerationSummary>> moderationQueue(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(opportunityService.moderationQueue(pageable)));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<PageResponse<OpportunityModerationSummary>> adminList(
            @RequestParam(required = false) String status, @RequestParam(required = false) String q, Pageable pageable) {
        return ApiResponse.of(PageResponse.from(opportunityService.adminList(status, q, pageable)));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<OpportunityDetailResponse> approve(@PathVariable UUID id) {
        return ApiResponse.of(opportunityService.approve(id, currentUser()));
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('OPPORTUNITY_PUBLISH')")
    public ApiResponse<OpportunityDetailResponse> publish(@PathVariable UUID id) {
        return ApiResponse.of(opportunityService.publish(id, currentUser()));
    }

    @PatchMapping("/{id}/schedule")
    @PreAuthorize("hasAuthority('OPPORTUNITY_PUBLISH')")
    public ApiResponse<OpportunityDetailResponse> schedule(
            @PathVariable UUID id, @jakarta.validation.Valid @RequestBody zm.eoz.platform.opportunity.dto.OpportunityScheduleRequest request) {
        return ApiResponse.of(opportunityService.schedule(id, request.scheduledAt(), currentUser()));
    }

    @PatchMapping("/{id}/request-changes")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<OpportunityDetailResponse> requestChanges(
            @PathVariable UUID id, @RequestBody(required = false) ModerationActionRequest request) {
        return ApiResponse.of(opportunityService.requestChanges(id, request, currentUser()));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<OpportunityDetailResponse> reject(
            @PathVariable UUID id, @RequestBody(required = false) ModerationActionRequest request) {
        return ApiResponse.of(opportunityService.reject(id, request, currentUser()));
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<OpportunityDetailResponse> close(@PathVariable UUID id) {
        return ApiResponse.of(opportunityService.close(id, currentUser()));
    }

    @GetMapping("/manage/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<OpportunityDetailResponse> getForManage(@PathVariable UUID id) {
        return ApiResponse.of(opportunityService.getForManage(id, currentUser()));
    }

    @PatchMapping("/manage/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<OpportunityDetailResponse> update(
            @PathVariable UUID id, @RequestBody zm.eoz.platform.opportunity.dto.OpportunityUpdateRequest request) {
        return ApiResponse.of(opportunityService.update(id, request, currentUser()));
    }

    @PatchMapping("/mine/{id}/close")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<OpportunityDetailResponse> closeMine(@PathVariable UUID id) {
        return ApiResponse.of(opportunityService.closeOwn(id, currentUser()));
    }

    @PatchMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<OpportunityDetailResponse> reopen(@PathVariable UUID id) {
        return ApiResponse.of(opportunityService.reopen(id, currentUser()));
    }

    @PatchMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<OpportunityDetailResponse> archive(@PathVariable UUID id) {
        return ApiResponse.of(opportunityService.archive(id, currentUser()));
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
