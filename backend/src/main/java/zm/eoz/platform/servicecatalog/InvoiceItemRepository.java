package zm.eoz.platform.servicecatalog;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, UUID> {
    List<InvoiceItem> findByInvoiceIdOrderByCreatedAtAsc(UUID invoiceId);
}
