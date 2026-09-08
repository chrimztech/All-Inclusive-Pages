package zm.eoz.platform.servicecatalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import zm.eoz.platform.identity.User;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    public enum Status {
        INITIATED,
        PENDING,
        SUCCEEDED,
        FAILED,
        EXPIRED,
        PARTIALLY_REFUNDED,
        REFUNDED
    }

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @Column(nullable = false)
    private BigDecimal amount;

    private String method;

    @Column(name = "provider_reference")
    private String providerReference;

    /** Mandatory for refunds/adjustments — why this financial change was authorised. */
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.INITIATED;

    @ManyToOne
    @JoinColumn(name = "recorded_by")
    private User recordedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
