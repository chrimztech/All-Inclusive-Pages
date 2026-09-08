package zm.eoz.platform.candidate;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedOpportunityRepository extends JpaRepository<SavedOpportunity, SavedOpportunityId> {
    List<SavedOpportunity> findById_UserIdOrderBySavedAtDesc(UUID userId);

    long countById_OpportunityIdIn(List<UUID> opportunityIds);

    long countById_OpportunityId(UUID opportunityId);
}
