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
import zm.eoz.platform.identity.User;

@Entity
@Table(name = "interview_feedback")
@Getter
@Setter
@NoArgsConstructor
public class InterviewFeedback {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "interview_id")
    private Interview interview;

    @ManyToOne
    @JoinColumn(name = "author_id")
    private User author;

    @Column(nullable = false)
    private int rating;

    private String comments;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
