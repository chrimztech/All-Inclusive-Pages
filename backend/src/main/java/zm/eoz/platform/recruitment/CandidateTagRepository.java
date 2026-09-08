package zm.eoz.platform.recruitment;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateTagRepository extends JpaRepository<CandidateTag, CandidateTag.CandidateTagId> {
    List<CandidateTag> findById_CandidateId(UUID candidateId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT DISTINCT t.id.candidateId FROM CandidateTag t WHERE t.id.tag = :tag")
    List<UUID> findCandidateIdsByTag(String tag);
}
