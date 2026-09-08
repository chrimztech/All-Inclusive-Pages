package zm.eoz.platform.content;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContentItemRepository extends JpaRepository<ContentItem, UUID> {
    Page<ContentItem> findAllByOrderByCreatedAtDesc(Pageable pageable);

    java.util.List<ContentItem> findByStatusAndScheduledAtBefore(ContentItem.Status status, java.time.Instant before);
}
