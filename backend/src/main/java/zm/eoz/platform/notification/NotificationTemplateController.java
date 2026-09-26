package zm.eoz.platform.notification;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/admin/notification-templates")
@PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
public class NotificationTemplateController {

    public record TemplateRequest(String subjectTemplate, String bodyTemplate, boolean emailEnabled) {}

    private final NotificationTemplateService templates;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public NotificationTemplateController(
            NotificationTemplateService templates, AuditService auditService, UserRepository userRepository) {
        this.templates = templates;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<List<NotificationTemplateService.Template>> list() {
        return ApiResponse.of(templates.list());
    }

    @PutMapping("/{type}")
    public ApiResponse<NotificationTemplateService.Template> save(
            @PathVariable String type, @RequestBody TemplateRequest request) {
        User actor = currentUser();
        var saved = templates.save(type, request.subjectTemplate(), request.bodyTemplate(), request.emailEnabled(), actor.getFullName());
        auditService.record(actor, "NOTIFICATION_TEMPLATE_UPDATED", "NotificationTemplate", type,
                "Updated " + type + " template" + (saved.emailEnabled() ? "" : " (email off)"));
        return ApiResponse.of(saved);
    }

    @DeleteMapping("/{type}")
    public ApiResponse<NotificationTemplateService.Template> reset(@PathVariable String type) {
        templates.reset(type);
        auditService.record(currentUser(), "NOTIFICATION_TEMPLATE_RESET", "NotificationTemplate", type,
                "Reset " + type + " template to the default");
        return ApiResponse.of(templates.get(type));
    }

    private User currentUser() {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
