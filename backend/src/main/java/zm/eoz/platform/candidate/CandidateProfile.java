package zm.eoz.platform.candidate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "candidate_profiles")
@Getter
@Setter
@NoArgsConstructor
public class CandidateProfile {

    /**
     * Same value as users.id (one-to-one via a shared primary key), but stored as a plain
     * assigned UUID rather than a JPA @MapsId relationship — @MapsId requires the associated
     * User to be managed in the *same* persistence context, which doesn't hold here since the
     * User is loaded by the controller before the service's own @Transactional method starts.
     */
    @Id
    @Column(name = "user_id")
    private UUID userId;

    private String headline;

    private String bio;

    private String location;

    @Column(name = "education_summary")
    private String educationSummary;

    @Column(name = "experience_summary")
    private String experienceSummary;

    /** Comma-separated skill tags (e.g. "SQL,Excel,Power BI"). */
    private String skills;

    @Column(name = "photo_file_id")
    private UUID photoFileId;

    @Column(name = "resume_file_id")
    private UUID resumeFileId;

    @Enumerated(EnumType.STRING)
    private Availability availability;

    @Column(name = "salary_expectation_min")
    private BigDecimal salaryExpectationMin;

    @Column(name = "salary_expectation_max")
    private BigDecimal salaryExpectationMax;

    @Column(name = "salary_currency")
    private String salaryCurrency;

    @Column(name = "linkedin_url")
    private String linkedinUrl;

    @Column(name = "portfolio_url")
    private String portfolioUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public CandidateProfile(UUID userId) {
        this.userId = userId;
    }
}
