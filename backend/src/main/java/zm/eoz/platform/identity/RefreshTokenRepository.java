package zm.eoz.platform.identity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    java.util.List<RefreshToken> findByUser_IdAndRevokedFalse(UUID userId);
}
