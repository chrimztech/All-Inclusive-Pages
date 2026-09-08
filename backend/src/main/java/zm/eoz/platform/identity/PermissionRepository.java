package zm.eoz.platform.identity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    List<Permission> findAllByOrderByCodeAsc();

    Optional<Permission> findByCode(String code);
}
