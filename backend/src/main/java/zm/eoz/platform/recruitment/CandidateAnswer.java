package zm.eoz.platform.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(name = "candidate_answers")
@Getter
@Setter
@NoArgsConstructor
public class CandidateAnswer {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "candidate_id")
    private PipelineCandidate candidate;

    @ManyToOne
    @JoinColumn(name = "question_id")
    private ScreeningQuestion question;

    private String answer;

    @Column(name = "knocked_out", nullable = false)
    private boolean knockedOut;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
