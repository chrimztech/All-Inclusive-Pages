package zm.eoz.platform.recruitment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateAnswerRepository extends JpaRepository<CandidateAnswer, UUID> {
    List<CandidateAnswer> findByCandidateIdOrderByCreatedAtAsc(UUID candidateId);
}
