package zm.eoz.platform.privacy;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

@RestController
public class PrivacyController {

    public record CancelRequest(String notes) {}

    private final PrivacyService privacyService;
    private final RetentionService retentionService;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public PrivacyController(
            PrivacyService privacyService, RetentionService retentionService, AuditService auditService, UserRepository userRepository) {
        this.privacyService = privacyService;
        this.retentionService = retentionService;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @GetMapping("/api/v1/admin/privacy/requests")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ApiResponse<List<PrivacyService.Request>> list(@RequestParam(required = false) String status) {
        return ApiResponse.of(privacyService.list(status));
    }

    @PostMapping("/api/v1/admin/privacy/requests/{id}/complete")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ApiResponse<PrivacyService.Request> complete(@PathVariable UUID id) {
        return ApiResponse.of(privacyService.complete(id, currentUser()));
    }

    @PostMapping("/api/v1/admin/privacy/requests/{id}/cancel")
    @PreAuthorize("hasAuthority('USER_MANAGE')")
    public ApiResponse<PrivacyService.Request> cancel(@PathVariable UUID id, @RequestBody(required = false) CancelRequest request) {
        return ApiResponse.of(privacyService.cancel(id, request != null ? request.notes() : null, currentUser()));
    }

    /** Runs the retention clean-up immediately instead of waiting for the nightly job. */
    @PostMapping("/api/v1/admin/privacy/retention/run")
    @PreAuthorize("hasAuthority('SYSTEM_MANAGE')")
    public ApiResponse<Map<String, Integer>> runRetention() {
        User actor = currentUser();
        Map<String, Integer> result = retentionService.run();
        auditService.record(actor, "RETENTION_RUN", "System", "retention", "Ran retention clean-up: " + result);
        return ApiResponse.of(result);
    }

    private User currentUser() {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
