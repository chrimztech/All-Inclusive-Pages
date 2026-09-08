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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.opportunity.dto.FraudReportDecisionRequest;
import zm.eoz.platform.opportunity.dto.FraudReportRequest;
import zm.eoz.platform.opportunity.dto.FraudReportResponse;
import zm.eoz.platform.security.UserPrincipal;

@RestController
public class FraudReportController {

    private final FraudReportService fraudReportService;
    private final UserRepository userRepository;

    public FraudReportController(FraudReportService fraudReportService, UserRepository userRepository) {
        this.fraudReportService = fraudReportService;
        this.userRepository = userRepository;
    }

    /** Public: anyone — signed in or not — can report a listing without exposing a moderation-only surface. */
    @PostMapping("/api/v1/fraud-reports")
    public ApiResponse<FraudReportResponse> submit(@Valid @RequestBody FraudReportRequest request) {
        return ApiResponse.of(fraudReportService.submit(request));
    }

    @GetMapping("/api/v1/admin/fraud-reports")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<PageResponse<FraudReportResponse>> list(
            @RequestParam(required = false) String status, Pageable pageable) {
        return ApiResponse.of(PageResponse.from(fraudReportService.list(status, pageable)));
    }

    @PatchMapping("/api/v1/admin/fraud-reports/{id}")
    @PreAuthorize("hasAuthority('OPPORTUNITY_MODERATE')")
    public ApiResponse<FraudReportResponse> decide(@PathVariable UUID id, @Valid @RequestBody FraudReportDecisionRequest request) {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        return ApiResponse.of(fraudReportService.decide(id, request.status(), actor));
    }
}
