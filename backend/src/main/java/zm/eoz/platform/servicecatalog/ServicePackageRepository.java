package zm.eoz.platform.servicecatalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServicePackageRepository extends JpaRepository<ServicePackage, UUID> {
    List<ServicePackage> findByActiveTrue();

    Optional<ServicePackage> findBySlugAndActiveTrue(String slug);
}
