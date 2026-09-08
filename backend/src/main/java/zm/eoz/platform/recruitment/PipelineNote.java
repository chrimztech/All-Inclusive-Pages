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
@Table(name = "pipeline_notes")
@Getter
@Setter
@NoArgsConstructor
public class PipelineNote {

    public enum Classification {
        PRIVATE_INTERNAL,
        CLIENT_VISIBLE
    }

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "candidate_id")
    private PipelineCandidate candidate;

    @ManyToOne
    @JoinColumn(name = "author_id")
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Classification classification = Classification.PRIVATE_INTERNAL;

    @Column(nullable = false)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
