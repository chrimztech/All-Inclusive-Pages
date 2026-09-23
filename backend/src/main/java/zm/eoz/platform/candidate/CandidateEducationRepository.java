package zm.eoz.platform.candidate;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateEducationRepository extends JpaRepository<CandidateEducation, UUID> {
    List<CandidateEducation> findByCandidateUserIdOrderByDisplayOrderAscStartDateDesc(UUID candidateUserId);

    void deleteByCandidateUserIdAndId(UUID candidateUserId, UUID id);
}
