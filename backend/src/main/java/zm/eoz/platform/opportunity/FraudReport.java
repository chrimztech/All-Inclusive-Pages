package zm.eoz.platform.opportunity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "fraud_reports")
@Getter
@Setter
@NoArgsConstructor
public class FraudReport {

    public enum Status {
        OPEN,
        RESOLVED,
        DISMISSED
    }

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "opportunity_id")
    private Opportunity opportunity;

    @Column(name = "listing_reference")
    private String listingReference;

    @Column(nullable = false)
    private String reason;

    private String description;

    @Column(name = "reporter_name")
    private String reporterName;

    @Column(name = "reporter_email")
    private String reporterEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.OPEN;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @ManyToOne
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;
}
