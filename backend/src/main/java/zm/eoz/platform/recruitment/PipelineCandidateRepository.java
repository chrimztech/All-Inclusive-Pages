package zm.eoz.platform.recruitment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PipelineCandidateRepository extends JpaRepository<PipelineCandidate, UUID> {
    List<PipelineCandidate> findByProjectIdOrderByAddedAtAsc(UUID projectId);

    List<PipelineCandidate> findByIdIn(List<UUID> ids);
}
