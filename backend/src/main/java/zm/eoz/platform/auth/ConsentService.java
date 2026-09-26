package zm.eoz.platform.auth;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Append-only consent history. Each grant or withdrawal is a new row, so the record shows what a person agreed to,
 * when and through which screen, rather than just their current setting.
 */
@Service
public class ConsentService {

    public enum Type { TERMS, PRIVACY, OPPORTUNITY_ALERTS, SERVICE_COMMS }

    public record ConsentEvent(String type, boolean granted, String source, Instant recordedAt) {}

    private final JdbcTemplate jdbc;

    public ConsentService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(UUID userId, Type type, boolean granted, String source) {
        jdbc.update(
                "insert into consents (user_id, consent_type, granted, source) values (?, ?, ?, ?)",
                userId, type.name(), granted, source);
    }

    public List<ConsentEvent> history(UUID userId) {
        return jdbc.query(
                "select consent_type, granted, source, recorded_at from consents where user_id = ? order by recorded_at desc, id",
                (rs, i) -> new ConsentEvent(
                        rs.getString("consent_type"),
                        rs.getBoolean("granted"),
                        rs.getString("source"),
                        toInstant(rs.getTimestamp("recorded_at"))),
                userId);
    }

    private static Instant toInstant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
