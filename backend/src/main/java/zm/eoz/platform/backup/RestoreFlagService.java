package zm.eoz.platform.backup;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.admin.HardDeleteService;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.backup.dto.RestoreFlagResponse;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.contact.ContactMessageService;
import zm.eoz.platform.content.ContentService;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.notification.NotificationService;

/**
 * Keeps permanent deletes from silently coming back after a database restore.
 *
 * <p>pg_restore --clean rewinds every table in the dump, including the deletion ledger, the backup list and
 * earlier flags. {@link #capture()} snapshots those just before the restore; {@link #reconcile} writes them
 * back and flags every ledger entry whose row exists again. Flagged listings that were live go back to
 * review and flagged accounts are deactivated until an administrator decides to keep or delete them again.
 */
@Service
public class RestoreFlagService {

    private static final Logger log = LoggerFactory.getLogger(RestoreFlagService.class);
    private static final Set<String> LIVE_LISTING_STATUSES = Set.of("PUBLISHED", "SCHEDULED", "APPROVED");
    private static final Set<String> SIGN_IN_USER_STATUSES = Set.of("ACTIVE", "PENDING_VERIFICATION");

    private final JdbcTemplate jdbc;
    private final DeletionLedger deletionLedger;
    private final HardDeleteService hardDeleteService;
    private final ContentService contentService;
    private final ContactMessageService contactMessageService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public RestoreFlagService(
            JdbcTemplate jdbc,
            DeletionLedger deletionLedger,
            HardDeleteService hardDeleteService,
            ContentService contentService,
            ContactMessageService contactMessageService,
            AuditService auditService,
            NotificationService notificationService,
            UserRepository userRepository) {
        this.jdbc = jdbc;
        this.deletionLedger = deletionLedger;
        this.hardDeleteService = hardDeleteService;
        this.contentService = contentService;
        this.contactMessageService = contactMessageService;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    /** Rows that must outlive the restore, read immediately before pg_restore runs. */
    public record Snapshot(
            List<Map<String, Object>> ledger, List<Map<String, Object>> backups, List<Map<String, Object>> flags) {}

    public Snapshot capture() {
        return new Snapshot(
                deletionLedger.snapshot(),
                jdbc.queryForList("select * from system_backups"),
                jdbc.queryForList("select * from restore_flags"));
    }

    /**
     * Writes the snapshot back into the restored database and flags deleted rows that returned.
     *
     * @return how many newly returned rows were flagged
     */
    public int reconcile(Snapshot snapshot, String restoredFrom, User actor) {
        for (Map<String, Object> b : snapshot.backups()) {
            jdbc.update(
                    "insert into system_backups (id, file_name, size_bytes, status, error_message, triggered_by, started_at, completed_at)"
                            + " values (?, ?, ?, ?, ?, (select id from users where id = ?), ?, ?) on conflict (id) do nothing",
                    b.get("id"), b.get("file_name"), b.get("size_bytes"), b.get("status"), b.get("error_message"),
                    b.get("triggered_by"), b.get("started_at"), b.get("completed_at"));
        }
        for (Map<String, Object> l : snapshot.ledger()) {
            jdbc.update(
                    "insert into deletion_ledger (id, entity_type, entity_id, label, confirm_value, erased_payments, deleted_by_name, deleted_at)"
                            + " values (?, ?, ?, ?, ?, ?, ?, ?) on conflict (id) do nothing",
                    l.get("id"), l.get("entity_type"), l.get("entity_id"), l.get("label"), l.get("confirm_value"),
                    l.get("erased_payments"), l.get("deleted_by_name"), l.get("deleted_at"));
        }
        for (Map<String, Object> f : snapshot.flags()) {
            jdbc.update(
                    "insert into restore_flags (id, ledger_id, entity_type, entity_id, label, deleted_by_name, deleted_at,"
                            + " restored_from, flagged_at, quarantined_from, resolution, resolved_by_name, resolved_at)"
                            + " values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict (id) do nothing",
                    f.get("id"), f.get("ledger_id"), f.get("entity_type"), f.get("entity_id"), f.get("label"),
                    f.get("deleted_by_name"), f.get("deleted_at"), f.get("restored_from"), f.get("flagged_at"),
                    f.get("quarantined_from"), f.get("resolution"), f.get("resolved_by_name"), f.get("resolved_at"));
        }

        int flagged = 0;
        for (Map<String, Object> l : snapshot.ledger()) {
            String type = (String) l.get("entity_type");
            UUID entityId = (UUID) l.get("entity_id");
            String table = DeletionLedger.TABLES.get(type);
            if (table == null || !exists(table, entityId)) {
                continue;
            }
            // Skip rows already under review, and deletes an administrator already chose to keep. A later
            // permanent delete of the same row has its own ledger entry and is flagged in its own right.
            Boolean alreadyHandled = jdbc.queryForObject(
                    "select exists(select 1 from restore_flags where (entity_type = ? and entity_id = ? and resolution is null)"
                            + " or (ledger_id = ? and resolution = 'KEPT'))",
                    Boolean.class, type, entityId, l.get("id"));
            if (Boolean.TRUE.equals(alreadyHandled)) {
                continue;
            }
            String quarantinedFrom = quarantine(type, entityId);
            jdbc.update(
                    "insert into restore_flags (ledger_id, entity_type, entity_id, label, deleted_by_name, deleted_at, restored_from, quarantined_from)"
                            + " values (?, ?, ?, ?, ?, ?, ?, ?)",
                    l.get("id"), type, entityId, l.get("label"), l.get("deleted_by_name"), l.get("deleted_at"),
                    restoredFrom, quarantinedFrom);
            flagged++;
        }

        if (flagged > 0) {
            auditService.record(actor, "RESTORE_FLAGGED_DELETED_ITEMS", "SystemBackup", restoredFrom,
                    flagged + " permanently deleted item(s) came back with the restore and were flagged for review");
            notifyAdministrators(flagged, restoredFrom);
        }
        return flagged;
    }

    @Transactional
    public List<RestoreFlagResponse> list() {
        // A flagged row can disappear on its own, e.g. a listing removed with its organisation.
        List<Map<String, Object>> open = jdbc.queryForList(
                "select id, entity_type, entity_id from restore_flags where resolution is null");
        for (Map<String, Object> f : open) {
            String table = DeletionLedger.TABLES.get((String) f.get("entity_type"));
            if (table != null && !exists(table, (UUID) f.get("entity_id"))) {
                jdbc.update("update restore_flags set resolution = 'GONE', resolved_at = now() where id = ?", f.get("id"));
            }
        }
        return jdbc.query(
                "select * from restore_flags order by (resolution is null) desc, flagged_at desc limit 200",
                (rs, i) -> new RestoreFlagResponse(
                        rs.getObject("id", UUID.class),
                        rs.getString("entity_type"),
                        rs.getObject("entity_id", UUID.class),
                        rs.getString("label"),
                        rs.getString("deleted_by_name"),
                        instant(rs.getTimestamp("deleted_at")),
                        rs.getString("restored_from"),
                        instant(rs.getTimestamp("flagged_at")),
                        rs.getString("quarantined_from"),
                        rs.getString("resolution"),
                        rs.getString("resolved_by_name"),
                        instant(rs.getTimestamp("resolved_at"))));
    }

    /** Accepts the returned row: lifts the quarantine and closes the flag. */
    @Transactional
    public void keep(UUID flagId, User actor) {
        Map<String, Object> flag = openFlag(flagId);
        String type = (String) flag.get("entity_type");
        UUID entityId = (UUID) flag.get("entity_id");
        String previous = (String) flag.get("quarantined_from");
        if (previous != null) {
            if ("Opportunity".equals(type)) {
                jdbc.update("update opportunities set status = ? where id = ? and status = 'PENDING_REVIEW'", previous, entityId);
            } else if ("User".equals(type)) {
                jdbc.update("update users set status = ? where id = ? and status = 'DEACTIVATED'", previous, entityId);
            }
        }
        resolve(flagId, "KEPT", actor);
        auditService.record(actor, "RESTORE_FLAG_KEPT", type, entityId.toString(),
                "Kept \"" + flag.get("label") + "\" after it returned with a restore");
    }

    /** Repeats the original permanent delete, with the same confirmation value it was first given. */
    @Transactional
    public void deleteAgain(UUID flagId, User actor) {
        Map<String, Object> flag = openFlag(flagId);
        String type = (String) flag.get("entity_type");
        UUID entityId = (UUID) flag.get("entity_id");
        Map<String, Object> ledger = jdbc.queryForList(
                        "select confirm_value, erased_payments from deletion_ledger where id = ?", flag.get("ledger_id"))
                .stream()
                .findFirst()
                .orElse(Map.of());
        String confirm = (String) ledger.get("confirm_value");
        switch (type) {
            case "User" -> hardDeleteService.deleteUser(
                    entityId, currentValue("select email from users where id = ?", entityId, confirm),
                    Boolean.TRUE.equals(ledger.get("erased_payments")), actor);
            case "Organisation" -> hardDeleteService.deleteOrganisation(
                    entityId, currentValue("select legal_name from organisations where id = ?", entityId, confirm), actor);
            case "Opportunity" -> hardDeleteService.deleteOpportunity(
                    entityId, currentValue("select reference from opportunities where id = ?", entityId, confirm), actor);
            case "ContentItem" -> contentService.delete(entityId, actor);
            case "ContactMessage" -> contactMessageService.delete(entityId, actor);
            default -> throw new BadRequestException("Unsupported item type: " + type);
        }
        resolve(flagId, "DELETED_AGAIN", actor);
    }

    private String quarantine(String type, UUID entityId) {
        if ("Opportunity".equals(type)) {
            String status = jdbc.queryForObject("select status from opportunities where id = ?", String.class, entityId);
            if (LIVE_LISTING_STATUSES.contains(status)) {
                jdbc.update("update opportunities set status = 'PENDING_REVIEW' where id = ?", entityId);
                return status;
            }
        } else if ("User".equals(type)) {
            String status = jdbc.queryForObject("select status from users where id = ?", String.class, entityId);
            if (SIGN_IN_USER_STATUSES.contains(status)) {
                jdbc.update("update users set status = 'DEACTIVATED' where id = ?", entityId);
                return status;
            }
        }
        return null;
    }

    private void notifyAdministrators(int flagged, String restoredFrom) {
        List<UUID> adminIds = jdbc.queryForList(
                "select distinct ur.user_id from user_roles ur join roles r on r.id = ur.role_id where r.name = 'ADMIN'",
                UUID.class);
        List<User> admins = new ArrayList<>(userRepository.findAllById(adminIds));
        for (User admin : admins) {
            try {
                notificationService.notify(
                        admin,
                        "RESTORE_FLAGGED",
                        flagged + " deleted item(s) came back with a restore",
                        "Restoring " + restoredFrom + " brought back " + flagged
                                + " item(s) that had been permanently deleted. Returned listings were sent back to review and"
                                + " returned accounts were deactivated. Review them under System health → Restored deletions.");
            } catch (RuntimeException e) {
                log.warn("Could not notify {} about restore flags: {}", admin.getEmail(), e.getMessage());
            }
        }
    }

    private Map<String, Object> openFlag(UUID flagId) {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from restore_flags where id = ?", flagId);
        if (rows.isEmpty()) {
            throw new NotFoundException("Restore flag not found: " + flagId);
        }
        Map<String, Object> flag = rows.get(0);
        if (flag.get("resolution") != null) {
            throw new BadRequestException("This flag has already been resolved.");
        }
        return flag;
    }

    private void resolve(UUID flagId, String resolution, User actor) {
        jdbc.update(
                "update restore_flags set resolution = ?, resolved_by_name = ?, resolved_at = now() where id = ?",
                resolution, actor.getFullName(), flagId);
    }

    /** The identifier as it stands in the restored row, falling back to the one recorded at delete time. */
    private String currentValue(String sql, UUID id, String fallback) {
        List<String> values = jdbc.queryForList(sql, String.class, id);
        return values.isEmpty() || values.get(0) == null ? fallback : values.get(0);
    }

    private boolean exists(String table, UUID id) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject("select exists(select 1 from " + table + " where id = ?)", Boolean.class, id));
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
