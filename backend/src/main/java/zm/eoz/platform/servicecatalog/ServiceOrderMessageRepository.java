package zm.eoz.platform.servicecatalog;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceOrderMessageRepository extends JpaRepository<ServiceOrderMessage, UUID> {
    List<ServiceOrderMessage> findByOrderIdOrderBySentAtAsc(UUID orderId);
}
