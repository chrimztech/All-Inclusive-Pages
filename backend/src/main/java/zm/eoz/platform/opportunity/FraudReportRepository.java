package zm.eoz.platform.opportunity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FraudReportRepository extends JpaRepository<FraudReport, java.util.UUID> {
    Page<FraudReport> findByStatusOrderByCreatedAtAsc(FraudReport.Status status, Pageable pageable);

    Page<FraudReport> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(FraudReport.Status status);
}
