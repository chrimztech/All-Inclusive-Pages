package zm.eoz.platform.identity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    java.util.List<RefreshToken> findByUser_IdAndRevokedFalse(UUID userId);

    boolean existsBySessionIdAndRevokedFalseAndExpiresAtAfter(UUID sessionId, java.time.Instant now);

    java.util.List<RefreshToken> findByUser_IdAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            UUID userId, java.time.Instant now);

    java.util.List<RefreshToken> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}
