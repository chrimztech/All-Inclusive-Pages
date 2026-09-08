package zm.eoz.platform.servicecatalog;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRepository extends JpaRepository<Quote, UUID> {
    List<Quote> findByOrderIdOrderByIssuedAtDesc(UUID orderId);
}
