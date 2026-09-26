package zm.eoz.platform.organisation;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganisationVerificationReviewRepository
        extends JpaRepository<OrganisationVerificationReview, UUID> {
    java.util.List<OrganisationVerificationReview> findByOrganisationIdOrderByReviewedAtDesc(UUID organisationId);
}
