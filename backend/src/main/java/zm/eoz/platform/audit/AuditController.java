package zm.eoz.platform.audit;

import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.audit.dto.AuditEventResponse;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;

@RestController
@RequestMapping("/api/v1/admin/audit")
@PreAuthorize("hasAuthority('AUDIT_READ')")
public class AuditController {

    private final AuditEventRepository auditEventRepository;

    public AuditController(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @GetMapping
    public ApiResponse<PageResponse<AuditEventResponse>> list(
            @RequestParam(required = false) String entityType, Pageable pageable) {
        var page = (entityType == null || entityType.isBlank())
                ? auditEventRepository.findAllByOrderByOccurredAtDesc(pageable)
                : auditEventRepository.findByEntityTypeOrderByOccurredAtDesc(entityType, pageable);
        return ApiResponse.of(PageResponse.from(page.map(AuditEventResponse::from)));
    }
}
