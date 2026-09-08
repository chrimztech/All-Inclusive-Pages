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

@Entity
@Table(name = "screening_questions")
@Getter
@Setter
@NoArgsConstructor
public class ScreeningQuestion {

    public enum Type {
        TEXT,
        YES_NO
    }

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private RecruitmentProject project;

    @Column(nullable = false)
    private String question;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false)
    private Type questionType = Type.TEXT;

    @Column(name = "knockout_answer")
    private String knockoutAnswer;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
