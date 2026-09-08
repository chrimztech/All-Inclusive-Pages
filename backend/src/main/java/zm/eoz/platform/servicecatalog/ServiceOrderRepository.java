package zm.eoz.platform.servicecatalog;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, UUID> {
    List<ServiceOrder> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    Page<ServiceOrder> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT o.status, COUNT(o) FROM ServiceOrder o GROUP BY o.status")
    List<Object[]> statusMixRaw();
}
