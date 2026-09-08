package zm.eoz.platform.candidate;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertSubscriptionRepository extends JpaRepository<AlertSubscription, UUID> {
    List<AlertSubscription> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
