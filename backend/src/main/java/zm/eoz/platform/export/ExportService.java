package zm.eoz.platform.export;

import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.ResultSetMetaData;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ForbiddenException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.security.SecurityAlertService;

/**
 * Background CSV exports. A request is queued; {@link #processQueue} (a scheduled job, lock-safe across instances)
 * writes the file; the requester downloads it until it expires. Each export type needs its own permission, personal
 * details are masked, and every cell is guarded against spreadsheet formula injection.
 */
@Service
public class ExportService {

    private static final Logger log = LoggerFactory.getLogger(ExportService.class);
    static final int KEEP_DAYS = 7;
    /** Requests by one person within an hour that trigger a security alert. */
    static final int ALERT_THRESHOLD_PER_HOUR = 5;

    /** An export: who may run it, the query, and which columns hold personal data to mask. */
    record ExportType(String label, String permission, String sql, Set<String> maskEmail, Set<String> maskPhone) {}

    static final Map<String, ExportType> TYPES = new LinkedHashMap<>();

    static {
        TYPES.put("OPPORTUNITIES", new ExportType("Opportunities", "OPPORTUNITY_MODERATE",
                "select o.reference, o.title, o.organisation_name as organisation, c.name as category, o.region, o.status,"
                        + " o.application_mode, o.verified, o.featured, o.views_count as views, o.apply_clicks, o.share_count as shares,"
                        + " o.deadline, o.published_at, o.created_at from opportunities o join opportunity_categories c on c.id = o.category_id"
                        + " order by o.created_at desc",
                Set.of(), Set.of()));
        TYPES.put("ORGANISATIONS", new ExportType("Organisations", "ORGANISATION_VERIFY",
                "select o.legal_name, o.trading_name, o.registration_number, o.sector, o.address, o.verification_status,"
                        + " (select count(*) from opportunities p where p.organisation_id = o.id and p.status = 'PUBLISHED') as live_listings,"
                        + " o.created_at from organisations o order by o.legal_name",
                Set.of(), Set.of()));
        TYPES.put("APPLICATIONS", new ExportType("Applications (EOZ-hosted)", "APPLICATION_MANAGE",
                "select a.reference, o.reference as listing_reference, o.title as listing, u.full_name as candidate,"
                        + " u.email as candidate_email, a.status, a.submitted_at, a.updated_at"
                        + " from applications a join opportunities o on o.id = a.opportunity_id join users u on u.id = a.candidate_id"
                        + " order by a.submitted_at desc",
                Set.of("candidate_email"), Set.of()));
        TYPES.put("SERVICE_ORDERS", new ExportType("Service orders", "SERVICE_VIEW",
                "select s.reference, p.name as service, s.status, u.full_name as customer, u.email as customer_email,"
                        + " s.revision_count, s.rating, s.created_at, s.updated_at from service_orders s"
                        + " join service_packages p on p.id = s.package_id join users u on u.id = s.customer_id order by s.created_at desc",
                Set.of("customer_email"), Set.of()));
        TYPES.put("INVOICES", new ExportType("Invoices", "FINANCE_MANAGE",
                "select i.reference, s.reference as order_reference, i.amount, i.currency, i.status, i.issued_at, i.due_at, i.paid_at"
                        + " from invoices i join service_orders s on s.id = i.order_id order by i.issued_at desc",
                Set.of(), Set.of()));
        TYPES.put("AUDIT_LOG", new ExportType("Audit log", "AUDIT_READ",
                "select e.occurred_at, coalesce(u.full_name, 'System') as actor, e.action, e.entity_type, e.entity_id, e.summary"
                        + " from audit_events e left join users u on u.id = e.actor_id order by e.occurred_at desc",
                Set.of(), Set.of()));
        TYPES.put("USERS", new ExportType("Users", "USER_MANAGE",
                "select u.full_name, u.email, u.phone, u.status, u.email_verified, u.mfa_enabled,"
                        + " (select string_agg(r.name, ' ') from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = u.id) as roles,"
                        + " u.created_at from users u order by u.created_at desc",
                Set.of("email"), Set.of("phone")));
    }

    public record TypeView(String type, String label) {}

    public record Job(
            UUID id, String exportType, String label, String status, String requestedByName, Integer rowCount, String error,
            Instant createdAt, Instant completedAt, Instant expiresAt) {}

    private final JdbcTemplate jdbc;
    private final AuditService auditService;
    private final SecurityAlertService securityAlertService;
    private final Path exportDir;

    public ExportService(
            JdbcTemplate jdbc,
            AuditService auditService,
            SecurityAlertService securityAlertService,
            @Value("${eoz.export.dir:./data/exports}") String exportDir) {
        this.jdbc = jdbc;
        this.auditService = auditService;
        this.securityAlertService = securityAlertService;
        this.exportDir = Path.of(exportDir);
        try {
            Files.createDirectories(this.exportDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create export directory: " + exportDir, e);
        }
    }

    public List<TypeView> availableTypes(User user) {
        return TYPES.entrySet().stream()
                .filter(e -> hasPermission(user, e.getValue().permission()))
                .map(e -> new TypeView(e.getKey(), e.getValue().label()))
                .toList();
    }

    public Job request(String type, User user) {
        ExportType exportType = TYPES.get(type);
        if (exportType == null) {
            throw new BadRequestException("Unknown export type: " + type);
        }
        if (!hasPermission(user, exportType.permission())) {
            auditService.record(user, "EXPORT_DENIED", "Export", type, "Tried to export " + exportType.label() + " without permission");
            throw new ForbiddenException("You do not have permission to export " + exportType.label().toLowerCase() + ".");
        }
        UUID id = UUID.randomUUID();
        jdbc.update("insert into export_jobs (id, export_type, requested_by, requested_by_name) values (?, ?, ?, ?)",
                id, type, user.getId(), user.getFullName());
        auditService.record(user, "EXPORT_REQUESTED", "Export", id.toString(), "Requested " + exportType.label() + " export");
        Integer lastHour = jdbc.queryForObject(
                "select count(*) from export_jobs where requested_by = ? and created_at > now() - interval '1 hour'",
                Integer.class, user.getId());
        if (lastHour != null && lastHour == ALERT_THRESHOLD_PER_HOUR) {
            securityAlertService.alertAdministrators("Unusual export activity",
                    user.getFullName() + " (" + user.getEmail() + ") requested " + lastHour + " data exports in the last hour.");
        }
        return get(id);
    }

    /** The caller's own exports; people with SYSTEM_MANAGE see everyone's. */
    public List<Job> list(User user) {
        boolean all = hasPermission(user, "SYSTEM_MANAGE");
        return jdbc.query(
                "select * from export_jobs" + (all ? "" : " where requested_by = ?") + " order by created_at desc limit 100",
                (rs, i) -> toJob(rs),
                all ? new Object[0] : new Object[] {user.getId()});
    }

    public Path fileFor(UUID id, User user) {
        Map<String, Object> row = jdbc.queryForList("select * from export_jobs where id = ?", id).stream()
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Export not found."));
        boolean own = user.getId().equals(row.get("requested_by"));
        if (!own && !hasPermission(user, "SYSTEM_MANAGE")) {
            throw new NotFoundException("Export not found.");
        }
        if (!"READY".equals(row.get("status"))) {
            throw new BadRequestException("This export is not ready to download.");
        }
        Path file = exportDir.resolve((String) row.get("file_name"));
        if (!Files.exists(file)) {
            throw new NotFoundException("The export file is no longer available.");
        }
        auditService.record(user, "EXPORT_DOWNLOADED", "Export", id.toString(), "Downloaded " + row.get("export_type") + " export");
        return file;
    }

    /** Runs queued exports. Lock-safe: each job is claimed with FOR UPDATE SKIP LOCKED. @return exports completed */
    public int processQueue() {
        int done = 0;
        for (int i = 0; i < 5; i++) {
            List<Map<String, Object>> claimed = jdbc.queryForList(
                    "update export_jobs set status = 'RUNNING', started_at = now() where id = ("
                            + " select id from export_jobs where status = 'QUEUED' order by created_at limit 1 for update skip locked)"
                            + " returning id, export_type");
            if (claimed.isEmpty()) break;
            UUID id = (UUID) claimed.get(0).get("id");
            String type = (String) claimed.get(0).get("export_type");
            try {
                String fileName = type.toLowerCase() + "-" + id + ".csv";
                int rows = write(TYPES.get(type), exportDir.resolve(fileName));
                jdbc.update(
                        "update export_jobs set status = 'READY', row_count = ?, file_name = ?, completed_at = now(),"
                                + " expires_at = now() + interval '" + KEEP_DAYS + " days' where id = ?",
                        rows, fileName, id);
                done++;
            } catch (Exception e) {
                log.error("Export {} failed", id, e);
                jdbc.update("update export_jobs set status = 'FAILED', error = ?, completed_at = now() where id = ?",
                        "The export could not be generated.", id);
            }
        }
        return done;
    }

    /** Deletes expired export files. @return exports expired */
    public int expireOld() {
        List<Map<String, Object>> due = jdbc.queryForList(
                "select id, file_name from export_jobs where status = 'READY' and expires_at < now()");
        for (Map<String, Object> row : due) {
            try {
                if (row.get("file_name") != null) Files.deleteIfExists(exportDir.resolve((String) row.get("file_name")));
            } catch (IOException e) {
                log.warn("Could not delete expired export {}", row.get("id"), e);
            }
            jdbc.update("update export_jobs set status = 'EXPIRED' where id = ?", row.get("id"));
        }
        return due.size();
    }

    private int write(ExportType type, Path target) throws IOException {
        int[] rows = {0};
        try (Writer out = Files.newBufferedWriter(target, StandardCharsets.UTF_8)) {
            out.write('﻿'); // lets Excel detect UTF-8
            jdbc.query(type.sql(), rs -> {
                try {
                    ResultSetMetaData meta = rs.getMetaData();
                    if (rows[0] == 0) {
                        List<String> headers = new ArrayList<>();
                        for (int c = 1; c <= meta.getColumnCount(); c++) headers.add(meta.getColumnLabel(c));
                        out.write(String.join(",", headers.stream().map(ExportService::cell).toList()) + "\r\n");
                    }
                    List<String> cells = new ArrayList<>();
                    for (int c = 1; c <= meta.getColumnCount(); c++) {
                        String column = meta.getColumnLabel(c);
                        Object value = rs.getObject(c);
                        String text = value == null ? "" : value instanceof Timestamp t ? t.toInstant().toString() : value.toString();
                        if (type.maskEmail().contains(column)) text = maskEmail(text);
                        if (type.maskPhone().contains(column)) text = maskPhone(text);
                        cells.add(cell(text));
                    }
                    out.write(String.join(",", cells) + "\r\n");
                    rows[0]++;
                } catch (IOException e) {
                    throw new IllegalStateException(e);
                }
            });
        }
        return rows[0];
    }

    /** CSV-escapes a value and neutralises leading =, +, - and @ so spreadsheets never treat it as a formula. */
    static String cell(String value) {
        String v = value == null ? "" : value;
        if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) v = "'" + v;
        if (v.contains(",") || v.contains("\"") || v.contains("\n") || v.contains("\r")) {
            v = "\"" + v.replace("\"", "\"\"") + "\"";
        }
        return v;
    }

    static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 0) return email.isEmpty() ? "" : "***";
        return email.charAt(0) + "***" + email.substring(at);
    }

    static String maskPhone(String phone) {
        String digits = phone.replaceAll("\\D", "");
        return digits.length() <= 3 ? (digits.isEmpty() ? "" : "***") : "***" + digits.substring(digits.length() - 3);
    }

    private Job get(UUID id) {
        return jdbc.query("select * from export_jobs where id = ?", (rs, i) -> toJob(rs), id).get(0);
    }

    private Job toJob(java.sql.ResultSet rs) throws java.sql.SQLException {
        String type = rs.getString("export_type");
        ExportType t = TYPES.get(type);
        return new Job(
                rs.getObject("id", UUID.class), type, t != null ? t.label() : type, rs.getString("status"),
                rs.getString("requested_by_name"), (Integer) rs.getObject("row_count"), rs.getString("error"),
                instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("completed_at")),
                instant(rs.getTimestamp("expires_at")));
    }

    private static boolean hasPermission(User user, String code) {
        return user.getRoles().stream().flatMap(r -> r.getPermissions().stream()).anyMatch(p -> code.equals(p.getCode()));
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
