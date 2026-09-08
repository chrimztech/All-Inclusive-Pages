package zm.eoz.platform.storage;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileAssetRepository extends JpaRepository<FileAsset, UUID> {
    List<FileAsset> findByOwnerTypeAndOwnerIdOrderByUploadedAtDesc(String ownerType, String ownerId);
}
