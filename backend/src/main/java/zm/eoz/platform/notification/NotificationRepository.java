package zm.eoz.platform.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndReadFalse(UUID userId);

    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
            "update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    int markAllRead(@org.springframework.data.repository.query.Param("userId") UUID userId);

    Page<Notification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByReadFalse();
}
