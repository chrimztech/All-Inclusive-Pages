package zm.eoz.platform.servicecatalog;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByOrderIdOrderByIssuedAtDesc(UUID orderId);

    java.util.Optional<Invoice> findByReference(String reference);

    Page<Invoice> findAllByOrderByIssuedAtDesc(Pageable pageable);

    long countByStatus(InvoiceStatus status);

    List<Invoice> findByOrder_CustomerIdOrderByIssuedAtDesc(UUID customerId);
}
