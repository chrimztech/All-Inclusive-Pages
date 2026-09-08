package zm.eoz.platform.organisation;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganisationRepository extends JpaRepository<Organisation, UUID> {
    long countByVerificationStatus(VerificationStatus verificationStatus);
}
