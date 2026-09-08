package zm.eoz.platform.contact;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, UUID> {

    Page<ContactMessage> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<ContactMessage> findByStatusOrderByCreatedAtDesc(ContactMessage.Status status, Pageable pageable);

    long countByStatus(ContactMessage.Status status);
}
