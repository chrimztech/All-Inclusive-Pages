package zm.eoz.platform.organisation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganisationMemberRepository extends JpaRepository<OrganisationMember, OrganisationMember.Id> {
    List<OrganisationMember> findById_OrganisationId(UUID organisationId);

    Optional<OrganisationMember> findById_OrganisationIdAndId_UserId(UUID organisationId, UUID userId);

    List<OrganisationMember> findById_UserId(UUID userId);
}
