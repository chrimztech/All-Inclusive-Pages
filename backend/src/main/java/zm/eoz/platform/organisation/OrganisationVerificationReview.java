package zm.eoz.platform.organisation;

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
@Table(name = "organisation_verification_reviews")
@Getter
@Setter
@NoArgsConstructor
public class OrganisationVerificationReview {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "organisation_id")
    private Organisation organisation;

    @ManyToOne
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VerificationStatus decision;

    private String notes;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt = Instant.now();
}
