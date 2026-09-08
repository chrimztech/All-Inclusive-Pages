package zm.eoz.platform.recruitment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRepository extends JpaRepository<Interview, UUID> {
    List<Interview> findByCandidateIdOrderByScheduledAtAsc(UUID candidateId);
}
