package zm.eoz.platform.content;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContentVariantRepository extends JpaRepository<ContentVariant, UUID> {
    List<ContentVariant> findByContentItemIdOrderByChannel(UUID contentItemId);

    Optional<ContentVariant> findByContentItemIdAndChannel(UUID contentItemId, ContentVariant.Channel channel);
}
