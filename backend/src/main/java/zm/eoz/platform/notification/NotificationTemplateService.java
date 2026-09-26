package zm.eoz.platform.notification;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import zm.eoz.platform.common.exception.BadRequestException;

/**
 * Admin-editable email wording per notification type. Templates use {{name}}, {{title}} and {{body}}, where title and
 * body are the specific message the system generated (e.g. which listing was approved), so wording can change without
 * losing the facts. Types with no saved template use {@link #DEFAULT_SUBJECT} / {@link #DEFAULT_BODY}.
 */
@Service
public class NotificationTemplateService {

    public static final String DEFAULT_SUBJECT = "{{title}}";
    public static final String DEFAULT_BODY = "Hello {{name}},\n\n{{body}}\n\n— Echo Opportunities Zambia";

    /** Account-security emails can be reworded but never switched off. */
    public static final Set<String> ALWAYS_EMAIL =
            Set.of("EMAIL_VERIFICATION", "PASSWORD_RESET", "ACCOUNT_LOCKED", "SECURITY_NOTICE", "SECURITY_ALERT");

    /** Service and billing emails obey the recipient's "service updates" preference. */
    public static final Set<String> SERVICE_TYPES = Set.of(
            "SERVICE_ORDER_MESSAGE", "SERVICE_QUOTE_ISSUED", "PAYMENT_RECEIVED", "INVOICE_CANCELLED", "REFUND_ISSUED");

    /** Every type the platform sends, with what triggers it. */
    public static final Map<String, String> KNOWN_TYPES = new LinkedHashMap<>();

    static {
        KNOWN_TYPES.put("EMAIL_VERIFICATION", "A new account is asked to verify its email address");
        KNOWN_TYPES.put("PASSWORD_RESET", "Someone requests a password reset");
        KNOWN_TYPES.put("APPLICATION_STATUS", "A candidate's EOZ-hosted application changes stage");
        KNOWN_TYPES.put("JOB_ALERT", "New listings match a candidate's alert (instant or digest)");
        KNOWN_TYPES.put("DEADLINE_REMINDER", "A saved listing closes within 48 hours");
        KNOWN_TYPES.put("OPPORTUNITY_APPROVED", "An employer's listing is approved");
        KNOWN_TYPES.put("OPPORTUNITY_PUBLISHED", "An employer's listing goes live");
        KNOWN_TYPES.put("OPPORTUNITY_CHANGES_REQUESTED", "Moderation asks an employer for changes");
        KNOWN_TYPES.put("OPPORTUNITY_REJECTED", "An employer's listing is rejected");
        KNOWN_TYPES.put("OPPORTUNITY_CLOSED", "An employer's listing is closed");
        KNOWN_TYPES.put("OPPORTUNITY_REOPENED", "A closed listing is reopened for review");
        KNOWN_TYPES.put("OPPORTUNITY_ARCHIVED", "A listing is archived by staff");
        KNOWN_TYPES.put("OPPORTUNITY_DEADLINE_EXTENDED", "Staff extend a listing's deadline");
        KNOWN_TYPES.put("SERVICE_QUOTE_ISSUED", "A customer receives a quote for a service order");
        KNOWN_TYPES.put("SERVICE_ORDER_MESSAGE", "A new message is posted on a service order");
        KNOWN_TYPES.put("PAYMENT_RECEIVED", "A payment is recorded against an invoice");
        KNOWN_TYPES.put("INVOICE_CANCELLED", "An unpaid invoice is cancelled");
        KNOWN_TYPES.put("REFUND_ISSUED", "A refund is issued");
        KNOWN_TYPES.put("RESTORE_FLAGGED", "A backup restore brought back deleted items (administrators)");
        KNOWN_TYPES.put("ACCOUNT_LOCKED", "An account is locked after repeated failed sign-ins");
        KNOWN_TYPES.put("SECURITY_NOTICE", "Two-step verification or account deletion changes on someone's own account");
        KNOWN_TYPES.put("SECURITY_ALERT", "Lockouts, privilege changes or unusual exports (administrators)");
    }

    public record Template(
            String type, String description, String subjectTemplate, String bodyTemplate, boolean emailEnabled,
            boolean customised, boolean alwaysEmail, String updatedByName, Instant updatedAt) {}

    private final JdbcTemplate jdbc;

    public NotificationTemplateService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Template> list() {
        return KNOWN_TYPES.keySet().stream().map(this::get).toList();
    }

    public Template get(String type) {
        Optional<Map<String, Object>> row = jdbc.queryForList("select * from notification_templates where type = ?", type)
                .stream()
                .findFirst();
        String description = KNOWN_TYPES.getOrDefault(type, type);
        boolean always = ALWAYS_EMAIL.contains(type);
        return row.map(r -> new Template(
                        type, description, (String) r.get("subject_template"), (String) r.get("body_template"),
                        always || (Boolean) r.get("email_enabled"), true, always, (String) r.get("updated_by_name"),
                        ((Timestamp) r.get("updated_at")).toInstant()))
                .orElse(new Template(type, description, DEFAULT_SUBJECT, DEFAULT_BODY, true, false, always, null, null));
    }

    public Template save(String type, String subject, String body, boolean emailEnabled, String actorName) {
        if (!KNOWN_TYPES.containsKey(type)) {
            throw new BadRequestException("Unknown notification type: " + type);
        }
        if (subject == null || subject.isBlank() || subject.length() > 255) {
            throw new BadRequestException("Subject is required and must be 255 characters or fewer.");
        }
        if (body == null || body.isBlank() || body.length() > 5000) {
            throw new BadRequestException("Body is required and must be 5000 characters or fewer.");
        }
        if (!body.contains("{{body}}") && !body.contains("{{title}}")) {
            throw new BadRequestException("The body must include {{body}} or {{title}} so the message's details are kept.");
        }
        jdbc.update(
                "insert into notification_templates (type, subject_template, body_template, email_enabled, updated_by_name, updated_at)"
                        + " values (?, ?, ?, ?, ?, now()) on conflict (type) do update set subject_template = excluded.subject_template,"
                        + " body_template = excluded.body_template, email_enabled = excluded.email_enabled,"
                        + " updated_by_name = excluded.updated_by_name, updated_at = now()",
                type, subject.trim(), body, ALWAYS_EMAIL.contains(type) || emailEnabled, actorName);
        return get(type);
    }

    public void reset(String type) {
        jdbc.update("delete from notification_templates where type = ?", type);
    }

    /** Renders a template's placeholders. Values are plain text; emails are sent as text, so nothing is interpreted. */
    public static String render(String template, String name, String title, String body) {
        return template
                .replace("{{name}}", name == null ? "" : name)
                .replace("{{title}}", title == null ? "" : title)
                .replace("{{body}}", body == null ? (title == null ? "" : title) : body);
    }
}
