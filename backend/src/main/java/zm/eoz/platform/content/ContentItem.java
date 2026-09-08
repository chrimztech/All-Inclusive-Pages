package zm.eoz.platform.content;

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
import zm.eoz.platform.opportunity.Opportunity;

@Entity
@Table(name = "content_items")
@Getter
@Setter
@NoArgsConstructor
public class ContentItem {

    public enum Series {
        MORNING_DEVOTION,
        AFTERNOON_CAREER,
        EVENING_DEVOTION,
        OPPORTUNITY_POST,
        GENERAL
    }

    public enum Status {
        DRAFT,
        PENDING_REVIEW,
        APPROVED,
        SCHEDULED,
        PUBLISHED
    }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    private Series series;

    @Column(nullable = false)
    private String body;

    @ManyToOne
    @JoinColumn(name = "opportunity_id")
    private Opportunity opportunity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.DRAFT;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "version_hash", nullable = false)
    private String versionHash;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
