package zm.eoz.platform.backup;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemBackupRepository extends JpaRepository<SystemBackup, UUID> {
    List<SystemBackup> findAllByOrderByStartedAtDesc();

    boolean existsByFileName(String fileName);
}
