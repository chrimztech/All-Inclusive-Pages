package zm.eoz.platform.audit.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.audit.AuditEvent;

public record AuditEventResponse(
        UUID id, String actorName, String action, String entityType, String entityId, String summary, Instant occurredAt) {
    public static AuditEventResponse from(AuditEvent e) {
        return new AuditEventResponse(
                e.getId(),
                e.getActor() != null ? e.getActor().getFullName() : "System",
                e.getAction(),
                e.getEntityType(),
                e.getEntityId(),
                e.getSummary(),
                e.getOccurredAt());
    }
}
