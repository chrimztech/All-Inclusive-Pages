package zm.eoz.platform.identity;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, java.util.UUID> {
    Optional<VerificationToken> findByTokenHashAndType(String tokenHash, VerificationToken.Type type);
}
