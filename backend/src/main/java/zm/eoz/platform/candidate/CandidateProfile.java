package zm.eoz.platform.candidate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public CandidateProfile(UUID userId) {
        this.userId = userId;
    }
}
