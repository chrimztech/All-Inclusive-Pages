package zm.eoz.platform.recruitment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningQuestionRepository extends JpaRepository<ScreeningQuestion, UUID> {
    List<ScreeningQuestion> findByProjectIdOrderByCreatedAtAsc(UUID projectId);
}
