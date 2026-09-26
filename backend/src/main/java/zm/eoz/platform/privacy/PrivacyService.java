package zm.eoz.platform.privacy;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.notification.NotificationService;
import zm.eoz.platform.storage.FileStorageService;

/**
 * Account deletion requests and data retention.
 *
 * <p>A deletion request deactivates the account and signs it out at once, then waits a grace period (setting
 * {@code privacy.deletion_grace_days}, default 30) in which it can be cancelled. Completion anonymises rather than
 * hard-deletes: personal data — profile, CVs and documents, languages, alerts, saved listings, sessions,
 * notifications — is erased, while records that must be kept (applications for the employer's history, payments,
 * consent evidence, audit events) stay attached to an anonymous "Erased user".
 */
@Service
public class PrivacyService {

    static final int DEFAULT_GRACE_DAYS = 30;

    public record Request(
            UUID id, UUID userId, String subjectLabel, String requestType, String status, Instant requestedAt, Instant dueAt,
            Instant completedAt, String completedByName, String notes) {}

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;

    public PrivacyService(
            JdbcTemplate jdbc,
            UserRepository userRepository,
            AuditService auditService,
            NotificationService notificationService,
            FileStorageService fileStorageService) {
        this.jdbc = jdbc;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public Request requestDeletion(User actor) {
        User user = userRepository.findById(actor.getId()).orElseThrow();
        Integer pending = jdbc.queryForObject(
                "select count(*) from privacy_requests where user_id = ? and status = 'PENDING'", Integer.class, user.getId());
        if (pending != null && pending > 0) {
            throw new ConflictException("You already have a deletion request in progress.");
        }
        int grace = graceDays();
        UUID id = UUID.randomUUID();
        jdbc.update(
                "insert into privacy_requests (id, user_id, subject_label, request_type, due_at) values (?, ?, ?, 'DELETION', now() + make_interval(days => ?))",
                id, user.getId(), user.getFullName(), grace);
        user.setStatus(zm.eoz.platform.identity.UserStatus.DEACTIVATED);
        jdbc.update("update refresh_tokens set revoked = true where user_id = ?", user.getId());
        auditService.record(user, "ACCOUNT_DELETION_REQUESTED", "User", user.getId().toString(),
                "Requested account deletion; account deactivated, erasure due in " + grace + " days");
        notificationService.notify(user, "SECURITY_NOTICE", "Your account deletion request",
                "Your EOZ account is closed and your personal data will be erased in " + grace
                        + " days. To keep your account, contact EOZ before then.");
        return get(id);
    }

    public List<Request> list(String status) {
        String where = status == null || status.isBlank() ? "" : " where status = ?";
        return jdbc.query("select * from privacy_requests" + where + " order by requested_at desc limit 200",
                (rs, i) -> new Request(
                        rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class), rs.getString("subject_label"),
                        rs.getString("request_type"), rs.getString("status"), instant(rs.getTimestamp("requested_at")),
                        instant(rs.getTimestamp("due_at")), instant(rs.getTimestamp("completed_at")),
                        rs.getString("completed_by_name"), rs.getString("notes")),
                where.isEmpty() ? new Object[0] : new Object[] {status});
    }

    /** Erases the account now, without waiting for the grace period. */
    @Transactional
    public Request complete(UUID requestId, User actor) {
        Map<String, Object> request = pending(requestId);
        anonymise((UUID) request.get("user_id"));
        jdbc.update(
                "update privacy_requests set status = 'COMPLETED', completed_at = now(), completed_by_name = ?,"
                        + " subject_label = 'Erased account' where id = ?",
                actor != null ? actor.getFullName() : "Scheduled retention", requestId);
        auditService.record(actor, "ACCOUNT_ERASED", "PrivacyRequest", requestId.toString(),
                "Personal data erased and account anonymised");
        return get(requestId);
    }

    /** Withdraws the request and reopens the account. */
    @Transactional
    public Request cancel(UUID requestId, String notes, User actor) {
        Map<String, Object> request = pending(requestId);
        UUID userId = (UUID) request.get("user_id");
        jdbc.update("update privacy_requests set status = 'CANCELLED', completed_at = now(), completed_by_name = ?, notes = ? where id = ?",
                actor.getFullName(), notes, requestId);
        userRepository.findById(userId).ifPresent(user -> {
            user.setStatus(zm.eoz.platform.identity.UserStatus.ACTIVE);
            notificationService.notify(user, "SECURITY_NOTICE", "Your account deletion was cancelled",
                    "Your EOZ account is open again and nothing was erased. You can sign in as usual.");
        });
        auditService.record(actor, "ACCOUNT_DELETION_CANCELLED", "PrivacyRequest", requestId.toString(),
                "Deletion request cancelled" + (notes == null || notes.isBlank() ? "" : ": " + notes));
        return get(requestId);
    }

    /** Requests whose grace period has passed, oldest first. */
    public List<UUID> dueRequestIds() {
        return jdbc.queryForList(
                "select id from privacy_requests where status = 'PENDING' and due_at <= now() order by due_at", UUID.class);
    }

    void anonymise(UUID userId) {
        String ownFiles = "(select id from file_assets where uploaded_by = ?)";
        List<String> storageKeys = jdbc.queryForList("select storage_key from file_assets where uploaded_by = ?", String.class, userId);
        jdbc.update("delete from candidate_profiles where user_id = ?", userId);
        jdbc.update("update applications set resume_file_id = null, cover_note = null where candidate_id = ?", userId);
        jdbc.update("update applications set resume_file_id = null where resume_file_id in " + ownFiles, userId);
        jdbc.update("update organisations set logo_file_id = null where logo_file_id in " + ownFiles, userId);
        jdbc.update("delete from service_deliverables where file_asset_id in " + ownFiles, userId);
        jdbc.update("delete from file_assets where uploaded_by = ?", userId);
        for (String table : List.of("candidate_work_experience", "candidate_education")) {
            jdbc.update("delete from " + table + " where candidate_user_id = ?", userId);
        }
        for (String table : List.of("candidate_languages", "candidate_certifications", "alert_subscriptions",
                "saved_opportunities", "deadline_reminders", "notifications", "refresh_tokens", "verification_tokens",
                "mfa_recovery_codes", "mfa_challenges")) {
            jdbc.update("delete from " + table + " where user_id = ?", userId);
        }
        jdbc.update(
                "update users set email = 'erased-' || id || '@erased.invalid', full_name = 'Erased user', phone = null,"
                        + " password_hash = '!erased', status = 'DEACTIVATED', email_verified = false, mfa_enabled = false,"
                        + " mfa_secret = null, mfa_last_step = null, opportunity_alerts_enabled = false, service_comms_enabled = false,"
                        + " failed_login_count = 0, locked_until = null where id = ?",
                userId);
        if (!storageKeys.isEmpty() && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    storageKeys.forEach(fileStorageService::deleteStoredFile);
                }
            });
        }
    }

    int graceDays() {
        List<String> value = jdbc.queryForList(
                "select value from system_settings where key = 'privacy.deletion_grace_days'", String.class);
        try {
            return value.isEmpty() ? DEFAULT_GRACE_DAYS : Math.max(0, Integer.parseInt(value.get(0).trim()));
        } catch (NumberFormatException e) {
            return DEFAULT_GRACE_DAYS;
        }
    }

    private Map<String, Object> pending(UUID requestId) {
        Map<String, Object> request = jdbc.queryForList("select * from privacy_requests where id = ?", requestId).stream()
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Request not found."));
        if (!"PENDING".equals(request.get("status"))) {
            throw new BadRequestException("This request has already been " + String.valueOf(request.get("status")).toLowerCase() + ".");
        }
        if (request.get("user_id") == null) {
            throw new BadRequestException("The account for this request no longer exists.");
        }
        return request;
    }

    private Request get(UUID id) {
        return list(null).stream().filter(r -> r.id().equals(id)).findFirst()
                .orElseGet(() -> jdbc.query("select * from privacy_requests where id = ?",
                                (rs, i) -> new Request(
                                        rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
                                        rs.getString("subject_label"), rs.getString("request_type"), rs.getString("status"),
                                        instant(rs.getTimestamp("requested_at")), instant(rs.getTimestamp("due_at")),
                                        instant(rs.getTimestamp("completed_at")), rs.getString("completed_by_name"),
                                        rs.getString("notes")),
                                id)
                        .get(0));
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
