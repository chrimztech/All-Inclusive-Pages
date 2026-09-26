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

    @GetMapping(value = "/export.csv", produces = "text/csv")
    public org.springframework.http.ResponseEntity<byte[]> exportCsv(@RequestParam(required = false) String entityType) {
        var pageable = org.springframework.data.domain.PageRequest.of(0, 5000);
        var page = (entityType == null || entityType.isBlank())
                ? auditEventRepository.findAllByOrderByOccurredAtDesc(pageable)
                : auditEventRepository.findByEntityTypeOrderByOccurredAtDesc(entityType, pageable);
        StringBuilder csv = new StringBuilder("Time,Actor,Action,Entity type,Entity ID,Summary\n");
        page.map(AuditEventResponse::from).forEach(e -> csv
                .append(e.occurredAt()).append(',')
                .append(csvField(e.actorName())).append(',')
                .append(csvField(e.action())).append(',')
                .append(csvField(e.entityType())).append(',')
                .append(csvField(e.entityId())).append(',')
                .append(csvField(e.summary())).append('\n'));
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"eoz-audit-log.csv\"")
                .contentType(org.springframework.http.MediaType.parseMediaType("text/csv"))
                .body(csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private static String csvField(String value) {
        if (value == null) {
            return "";
        }
        String v = value.replace("\r", " ").replace("\n", " ");
        // Neutralise spreadsheet formula injection from user-supplied text.
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0) {
            v = "'" + v;
        }
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }
}
