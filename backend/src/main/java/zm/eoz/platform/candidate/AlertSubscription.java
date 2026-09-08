package zm.eoz.platform.candidate;

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
import zm.eoz.platform.opportunity.OpportunityCategory;

@Entity
@Table(name = "alert_subscriptions")
@Getter
@Setter
@NoArgsConstructor
public class AlertSubscription {

    public enum Frequency {
        INSTANT,
        DAILY,
        WEEKLY
    }

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private OpportunityCategory category;

    private String keyword;

    private String region;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Frequency frequency = Frequency.INSTANT;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
