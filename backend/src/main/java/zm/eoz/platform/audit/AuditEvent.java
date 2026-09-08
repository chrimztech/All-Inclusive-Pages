package zm.eoz.platform.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import zm.eoz.platform.identity.User;

@Entity
@Table(name = "audit_events")
@Getter
@Setter
@NoArgsConstructor
public class AuditEvent {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(nullable = false)
    private String action;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id")
    private String entityId;

    private String summary;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();
}
