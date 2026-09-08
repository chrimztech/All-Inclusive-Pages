package zm.eoz.platform.recruitment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PipelineNoteRepository extends JpaRepository<PipelineNote, UUID> {
    List<PipelineNote> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);
}
