package zm.eoz.platform.recruitment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewFeedbackRepository extends JpaRepository<InterviewFeedback, UUID> {
    List<InterviewFeedback> findByInterviewIdOrderByCreatedAtDesc(UUID interviewId);
}
