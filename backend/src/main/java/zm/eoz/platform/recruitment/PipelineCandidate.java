package zm.eoz.platform.recruitment;

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
@Table(name = "pipeline_candidates")
@Getter
@Setter
@NoArgsConstructor
public class PipelineCandidate {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private RecruitmentProject project;

    @Column(name = "candidate_name", nullable = false)
    private String candidateName;

    @Column(name = "candidate_email")
    private String candidateEmail;

    @ManyToOne
    @JoinColumn(name = "candidate_user_id")
    private User candidateUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PipelineStage stage = PipelineStage.RECEIVED;

    private String source;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
