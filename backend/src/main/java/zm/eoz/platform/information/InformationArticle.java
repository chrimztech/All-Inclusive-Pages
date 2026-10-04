package zm.eoz.platform.information;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import zm.eoz.platform.identity.User;

/** A long-form guide published in the public Information Hub. */
@Entity
@Table(name = "information_articles")
@Getter
@Setter
@NoArgsConstructor
public class InformationArticle {

    public enum Category {
        OPPORTUNITY_GUIDES,
        APPLICATION_ADVICE,
        CAREER_GROWTH,
        WORKPLACE,
        BUSINESS,
        TRUST_SAFETY
    }

    public enum Status {
        DRAFT,
        PUBLISHED
    }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 190)
    private String slug;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 360)
    private String excerpt;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Category category;

    @Column(nullable = false)
    private boolean featured;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.DRAFT;

    @Column(name = "source_name", length = 160)
    private String sourceName;

    @Column(name = "source_url", length = 1000)
    private String sourceUrl;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }
}
