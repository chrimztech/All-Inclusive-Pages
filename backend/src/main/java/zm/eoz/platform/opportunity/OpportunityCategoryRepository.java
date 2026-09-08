package zm.eoz.platform.opportunity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OpportunityCategoryRepository extends JpaRepository<OpportunityCategory, UUID> {
    Optional<OpportunityCategory> findByCodeIgnoreCase(String code);
}
