package zm.eoz.platform.notification;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;

/**
 * Email outbox. {@link #enqueue} runs inside the notification's own transaction, so an email exists exactly when
 * its notification does. {@link #sendDue} claims due rows with FOR UPDATE SKIP LOCKED — safe with several backend
 * instances — sends them, and on failure retries with growing delays until {@link #MAX_ATTEMPTS}, after which the
 * row is parked as DEAD for an administrator to inspect and retry.
 */
@Service
public class EmailDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(EmailDeliveryService.class);
    static final int MAX_ATTEMPTS = 5;
    /** Wait before attempt n+1 after n failures. */
    private static final List<Duration> BACKOFF = List.of(
            Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(30), Duration.ofHours(2), Duration.ofHours(12));
    /** A claimed row not finished within this lease is picked up again, e.g. after a crash mid-send. */
    private static final String LEASE = "10 minutes";

    public record Delivery(
            UUID id, String notificationType, String recipient, String subject, String status, int attempts,
            Instant nextAttemptAt, String lastError, Instant createdAt, Instant sentAt) {}

    private final JdbcTemplate jdbc;
    private final JavaMailSender mailSender;

    public EmailDeliveryService(JdbcTemplate jdbc, JavaMailSender mailSender) {
        this.jdbc = jdbc;
        this.mailSender = mailSender;
    }

    public void enqueue(UUID notificationId, String type, String recipient, String subject, String body) {
        jdbc.update(
                "insert into notification_deliveries (notification_id, notification_type, recipient, subject, body)"
                        + " values (?, ?, ?, ?, ?)",
                notificationId, type, recipient, truncate(subject, 255), body);
    }

    /** Sends every due email once. @return emails sent successfully */
    public int sendDue() {
        List<Map<String, Object>> claimed = jdbc.queryForList(
                "update notification_deliveries set status = 'SENDING', attempts = attempts + 1,"
                        + " next_attempt_at = now() + interval '" + LEASE + "'"
                        + " where id in (select id from notification_deliveries"
                        + "   where status in ('PENDING', 'RETRY', 'SENDING') and next_attempt_at <= now()"
                        + "   order by next_attempt_at limit 25 for update skip locked)"
                        + " returning id, recipient, subject, body, attempts");
        int sent = 0;
        for (Map<String, Object> row : claimed) {
            UUID id = (UUID) row.get("id");
            int attempts = ((Number) row.get("attempts")).intValue();
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo((String) row.get("recipient"));
                message.setSubject((String) row.get("subject"));
                message.setText((String) row.get("body"));
                mailSender.send(message);
                jdbc.update("update notification_deliveries set status = 'SENT', sent_at = now(), last_error = null where id = ?", id);
                sent++;
            } catch (RuntimeException e) {
                String error = truncate(e.getClass().getSimpleName() + ": " + e.getMessage(), 1000);
                if (attempts >= MAX_ATTEMPTS) {
                    jdbc.update("update notification_deliveries set status = 'DEAD', last_error = ? where id = ?", error, id);
                    log.warn("Email {} to {} is dead after {} attempts: {}", id, row.get("recipient"), attempts, error);
                } else {
                    Duration wait = BACKOFF.get(Math.min(attempts - 1, BACKOFF.size() - 1));
                    jdbc.update(
                            "update notification_deliveries set status = 'RETRY', last_error = ?, next_attempt_at = ? where id = ?",
                            error, Timestamp.from(Instant.now().plus(wait)), id);
                }
            }
        }
        return sent;
    }

    public List<Delivery> list(String status, int limit) {
        String where = status == null || status.isBlank() ? "" : " where status = ?";
        Object[] args = where.isEmpty() ? new Object[] {Math.min(limit, 500)} : new Object[] {status, Math.min(limit, 500)};
        return jdbc.query(
                "select * from notification_deliveries" + where + " order by created_at desc limit ?",
                (rs, i) -> new Delivery(
                        rs.getObject("id", UUID.class),
                        rs.getString("notification_type"),
                        rs.getString("recipient"),
                        rs.getString("subject"),
                        rs.getString("status"),
                        rs.getInt("attempts"),
                        instant(rs.getTimestamp("next_attempt_at")),
                        rs.getString("last_error"),
                        instant(rs.getTimestamp("created_at")),
                        instant(rs.getTimestamp("sent_at"))),
                args);
    }

    public Map<String, Long> summary() {
        Map<String, Long> counts = new java.util.LinkedHashMap<>();
        for (String s : List.of("PENDING", "SENDING", "RETRY", "SENT", "DEAD")) counts.put(s, 0L);
        jdbc.query("select status, count(*) as n from notification_deliveries group by status",
                rs -> {
                    counts.put(rs.getString("status"), rs.getLong("n"));
                });
        return counts;
    }

    /** Puts a failed or dead email back in the queue for immediate sending. */
    public void retry(UUID id) {
        List<String> status = jdbc.queryForList("select status from notification_deliveries where id = ?", String.class, id);
        if (status.isEmpty()) {
            throw new NotFoundException("Delivery not found.");
        }
        if (!List.of("DEAD", "RETRY").contains(status.get(0))) {
            throw new BadRequestException("Only failed or dead emails can be retried.");
        }
        jdbc.update(
                "update notification_deliveries set status = 'PENDING', attempts = 0, next_attempt_at = now() where id = ?", id);
    }

    private static String truncate(String value, int max) {
        return value == null ? null : value.length() <= max ? value : value.substring(0, max);
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
