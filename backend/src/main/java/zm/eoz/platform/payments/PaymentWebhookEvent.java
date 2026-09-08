package zm.eoz.platform.payments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payment_webhook_events")
@Getter
@Setter
@NoArgsConstructor
public class PaymentWebhookEvent {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String provider;

    @Column(name = "external_event_id", nullable = false)
    private String externalEventId;

    @Column(nullable = false)
    private String payload;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt = Instant.now();

    public PaymentWebhookEvent(String provider, String externalEventId, String payload) {
        this.provider = provider;
        this.externalEventId = externalEventId;
        this.payload = payload;
    }
}
