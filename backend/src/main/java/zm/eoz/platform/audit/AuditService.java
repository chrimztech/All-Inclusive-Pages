package zm.eoz.platform.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
        auditEventRepository.save(event);
    }
}
