package zm.eoz.platform.opportunity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import zm.eoz.platform.organisation.Organisation;

@Entity
@jakarta.persistence.EntityListeners(OpportunityVersionRecorder.Listener.class)
@Table(name = "opportunities")
@Getter
@Setter
@NoArgsConstructor
public class Opportunity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String title;

    @ManyToOne
    private OpportunityCategory category;

    @ManyToOne
    private Organisation organisation;

    @Column(name = "organisation_name", nullable = false)
    private String organisationName;

    @Column(nullable = false)
    private String description;

    private String responsibilities;
    private String requirements;
    private String benefits;
    private String location;
    private String region;

    @Column(name = "work_mode")
    private String workMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type")
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_arrangement")
    private WorkArrangement workArrangement;

    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level")
    private ExperienceLevel experienceLevel;

    @Column(name = "opportunity_value")
    private String opportunityValue;

    @Column(name = "opportunity_value_unit")
    private String opportunityValueUnit;

    @Column(name = "salary_min")
    private java.math.BigDecimal salaryMin;

    @Column(name = "salary_max")
    private java.math.BigDecimal salaryMax;

    @Column(name = "salary_visible", nullable = false)
    private boolean salaryVisible;

    @Column(nullable = false)
    private String currency = "ZMW";

    private Integer slots;

    @Column(name = "opening_date")
    private LocalDate openingDate;

    private Instant deadline;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "application_mode", nullable = false)
    private ApplicationMode applicationMode;

    @Column(name = "application_url")
    private String applicationUrl;

    @Column(name = "application_email")
    private String applicationEmail;

    @Column(name = "application_address")
    private String applicationAddress;

    private String source;

    @Column(nullable = false)
    private boolean verified;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OpportunityStatus status = OpportunityStatus.DRAFT;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "views_count", nullable = false)
    private long viewsCount;

    /** Staff-curated: shown in the home page's featured strip while published. */
    @Column(nullable = false)
    private boolean featured;

    /** Clicks on the employer's official application route from the listing page. */
    @Column(name = "apply_clicks", nullable = false)
    private long applyClicks;

    @Column(name = "share_count", nullable = false)
    private long shareCount;

    @ManyToOne
    @jakarta.persistence.JoinColumn(name = "created_by")
    private zm.eoz.platform.identity.User createdBy;

    @ManyToOne
    @jakarta.persistence.JoinColumn(name = "flagged_duplicate_of")
    private Opportunity flaggedDuplicateOf;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
