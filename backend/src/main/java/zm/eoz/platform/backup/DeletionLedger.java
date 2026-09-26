package zm.eoz.platform.backup;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import zm.eoz.platform.identity.User;

/**
 * Append-only record of permanent deletes. Written in the same transaction as the delete itself, so a
 * rolled-back delete leaves no entry. Plain JDBC on purpose: it has to keep working against whatever
 * schema a restored dump brings back.
 */
@Component
public class DeletionLedger {

    /** Entity types the ledger understands, mapped to the table their id lives in. */
    static final Map<String, String> TABLES = Map.of(
            "User", "users",
            "Organisation", "organisations",
            "Opportunity", "opportunities",
            "ContentItem", "content_items",
            "ContactMessage", "contact_messages");

    private final JdbcTemplate jdbc;

    public DeletionLedger(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(String entityType, UUID entityId, String label, User actor) {
        record(entityType, entityId, label, null, false, actor);
    }

    /**
     * @param confirmValue the value the delete was confirmed with, so "delete again" can repeat it exactly
     * @param erasedPayments whether a user delete also erased that user's payment records
     */
    public void record(
            String entityType, UUID entityId, String label, String confirmValue, boolean erasedPayments, User actor) {
        if (!TABLES.containsKey(entityType)) {
            throw new IllegalArgumentException("Unknown ledger entity type: " + entityType);
        }
        jdbc.update(
                "insert into deletion_ledger (entity_type, entity_id, label, confirm_value, erased_payments, deleted_by_name)"
                        + " values (?, ?, ?, ?, ?, ?)",
                entityType,
                entityId,
                label,
                confirmValue,
                erasedPayments,
                actor != null ? actor.getFullName() : null);
    }

    List<Map<String, Object>> snapshot() {
        return jdbc.queryForList("select * from deletion_ledger");
    }
}
