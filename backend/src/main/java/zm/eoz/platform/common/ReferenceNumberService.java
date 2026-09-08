package zm.eoz.platform.common;

import java.time.Year;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generates collision-safe, human-readable reference numbers such as EOZ-OPP-2026-000001.
 * Runs in its own transaction so the sequence row's lock is released immediately,
 * independent of the caller's (potentially longer) transaction.
 */
@Service
public class ReferenceNumberService {

    private final jakarta.persistence.EntityManager entityManager;

    public ReferenceNumberService(jakarta.persistence.EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public String next(String prefix) {
        int year = Year.now().getValue();
        entityManager
                .createNativeQuery(
                        "INSERT INTO reference_sequences (prefix, year, last_value) VALUES (:prefix, :year, 1) "
                                + "ON CONFLICT (prefix) DO UPDATE SET last_value = "
                                + "CASE WHEN reference_sequences.year = :year THEN reference_sequences.last_value + 1 ELSE 1 END, "
                                + "year = :year")
                .setParameter("prefix", prefix)
                .setParameter("year", year)
                .executeUpdate();

        Number lastValue = (Number) entityManager
                .createNativeQuery("SELECT last_value FROM reference_sequences WHERE prefix = :prefix")
                .setParameter("prefix", prefix)
                .getSingleResult();

        return "%s-%d-%06d".formatted(prefix, year, lastValue.longValue());
    }
}
