package zm.eoz.platform.audit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import zm.eoz.platform.common.CorrelationIdFilter;
import zm.eoz.platform.identity.User;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional
    public void record(User actor, String action, String entityType, String entityId, String summary) {
        AuditEvent event = new AuditEvent();
        event.setActor(actor);
        event.setAction(action);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setSummary(summary);
        event.setCorrelationId(CorrelationIdFilter.current());
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest request = attrs.getRequest();
            event.setIp(truncate(request.getRemoteAddr(), 64));
            event.setUserAgent(truncate(request.getHeader("User-Agent"), 255));
        }
        auditEventRepository.save(event);
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
