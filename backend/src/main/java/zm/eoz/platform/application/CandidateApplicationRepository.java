package zm.eoz.platform.application;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateApplicationRepository extends JpaRepository<CandidateApplication, UUID> {
    List<CandidateApplication> findByCandidateIdOrderBySubmittedAtDesc(UUID candidateId);

    List<CandidateApplication> findByOpportunityIdOrderBySubmittedAtDesc(UUID opportunityId);

    boolean existsByOpportunityIdAndCandidateId(UUID opportunityId, UUID candidateId);

    long countBySubmittedAtAfter(java.time.Instant since);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM CandidateApplication a WHERE lower(a.opportunity.title) LIKE lower(concat('%', :q, '%')) OR lower(a.candidate.fullName) LIKE lower(concat('%', :q, '%')) OR lower(a.candidate.email) LIKE lower(concat('%', :q, '%')) ORDER BY a.submittedAt DESC")
    org.springframework.data.domain.Page<CandidateApplication> search(
            @org.springframework.data.repository.query.Param("q") String q, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM CandidateApplication a WHERE a.status = :status AND (lower(a.opportunity.title) LIKE lower(concat('%', :q, '%')) OR lower(a.candidate.fullName) LIKE lower(concat('%', :q, '%')) OR lower(a.candidate.email) LIKE lower(concat('%', :q, '%'))) ORDER BY a.submittedAt DESC")
    org.springframework.data.domain.Page<CandidateApplication> searchByStatus(
            @org.springframework.data.repository.query.Param("status") ApplicationStatus status,
            @org.springframework.data.repository.query.Param("q") String q,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT a.status, COUNT(a) FROM CandidateApplication a GROUP BY a.status")
    List<Object[]> statusMixRaw();
}
