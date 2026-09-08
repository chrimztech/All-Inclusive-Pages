package zm.eoz.platform.payments;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentWebhookEventRepository extends JpaRepository<PaymentWebhookEvent, UUID> {
    boolean existsByProviderAndExternalEventId(String provider, String externalEventId);
}
