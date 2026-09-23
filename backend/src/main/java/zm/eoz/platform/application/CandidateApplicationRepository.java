package zm.eoz.platform.application;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateApplicationRepository extends JpaRepository<CandidateApplication, UUID> {
    List<CandidateApplication> findByCandidateIdOrderBySubmittedAtDesc(UUID candidateId);

    List<CandidateApplication> findByOpportunityIdOrderBySubmittedAtDesc(UUID opportunityId);

    boolean existsByOpportunityIdAndCandidateId(UUID opportunityId, UUID candidateId);

    long countBySubmittedAtAfter(java.time.Instant since);

    @org.springframework.data.jpa.repository.Query("SELECT a.status, COUNT(a) FROM CandidateApplication a GROUP BY a.status")
    List<Object[]> statusMixRaw();
}
