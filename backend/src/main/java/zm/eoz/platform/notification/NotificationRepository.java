package zm.eoz.platform.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndReadFalse(UUID userId);

    Page<Notification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByReadFalse();
}
