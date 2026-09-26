package zm.eoz.platform.candidate;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.notification.NotificationService;

/**
 * Delivers candidates' opportunity alerts and closing-soon reminders for saved listings.
 *
 * <p>Idempotent and safe across instances: a listing is announced only after its (subscription, listing) row is
 * inserted into alert_deliveries, and a reminder only after its (user, listing) row is inserted into
 * deadline_reminders, so a second run or a second instance finds nothing left to send. Candidates who switched
 * off opportunity alerts in their preferences receive neither.
 */
@Service
public class AlertDispatchService {

    private static final Logger log = LoggerFactory.getLogger(AlertDispatchService.class);
    /** Instant alerts never reach back further than this, so a new subscription is not flooded with old listings. */
    private static final Duration INSTANT_LOOKBACK = Duration.ofDays(3);
    static final Duration REMINDER_WINDOW = Duration.ofHours(48);

    private final JdbcTemplate jdbc;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public AlertDispatchService(JdbcTemplate jdbc, NotificationService notificationService, UserRepository userRepository) {
        this.jdbc = jdbc;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    /** Announces newly published matches to INSTANT subscriptions. @return notifications sent */
    public int dispatchInstant() {
        int sent = 0;
        for (Map<String, Object> sub : activeSubscriptions("INSTANT")) {
            Instant createdAt = ((Timestamp) sub.get("created_at")).toInstant();
            Instant since = max(createdAt, Instant.now().minus(INSTANT_LOOKBACK));
            List<Map<String, Object>> fresh = claim(sub, since);
            if (!fresh.isEmpty() && notify((UUID) sub.get("user_id"), fresh, "New opportunities match your alert")) {
                sent++;
            }
        }
        return sent;
    }

    /** Sends DAILY and WEEKLY digests that are due. @return digests sent */
    public int dispatchDigests() {
        int sent = 0;
        for (String frequency : List.of("DAILY", "WEEKLY")) {
            Duration period = "DAILY".equals(frequency) ? Duration.ofDays(1) : Duration.ofDays(7);
            for (Map<String, Object> sub : activeSubscriptions(frequency)) {
                Instant last = sub.get("last_digest_at") != null
                        ? ((Timestamp) sub.get("last_digest_at")).toInstant()
                        : ((Timestamp) sub.get("created_at")).toInstant();
                if (last.plus(period).isAfter(Instant.now())) {
                    continue;
                }
                // Claim the digest window first so a concurrent run skips it.
                int claimed = jdbc.update(
                        "update alert_subscriptions set last_digest_at = now() where id = ?"
                                + " and coalesce(last_digest_at, created_at) = ?",
                        sub.get("id"), Timestamp.from(last));
                if (claimed == 0) {
                    continue;
                }
                List<Map<String, Object>> fresh = claim(sub, last);
                String title = ("DAILY".equals(frequency) ? "Your daily" : "Your weekly") + " opportunity digest";
                if (!fresh.isEmpty() && notify((UUID) sub.get("user_id"), fresh, title)) {
                    sent++;
                }
            }
        }
        return sent;
    }

    /** Reminds candidates about saved listings that close within 48 hours. @return reminders sent */
    public int dispatchDeadlineReminders() {
        List<Map<String, Object>> due = jdbc.queryForList(
                "select s.user_id, o.id, o.title, o.reference, o.deadline from saved_opportunities s"
                        + " join opportunities o on o.id = s.opportunity_id"
                        + " join users u on u.id = s.user_id"
                        + " where o.status = 'PUBLISHED' and o.deadline > now() and o.deadline <= ?"
                        + " and u.opportunity_alerts_enabled and u.status = 'ACTIVE'"
                        + " and not exists (select 1 from deadline_reminders r where r.user_id = s.user_id and r.opportunity_id = o.id)",
                Timestamp.from(Instant.now().plus(REMINDER_WINDOW)));
        int sent = 0;
        for (Map<String, Object> row : due) {
            int inserted = jdbc.update(
                    "insert into deadline_reminders (user_id, opportunity_id) values (?, ?) on conflict do nothing",
                    row.get("user_id"), row.get("id"));
            if (inserted == 0) {
                continue;
            }
            var user = userRepository.findById((UUID) row.get("user_id"));
            if (user.isEmpty()) {
                continue;
            }
            long hours = Math.max(1, Duration.between(Instant.now(), ((Timestamp) row.get("deadline")).toInstant()).toHours());
            notificationService.notify(
                    user.get(),
                    "DEADLINE_REMINDER",
                    "Closing soon: " + row.get("title"),
                    "\"" + row.get("title") + "\" (" + row.get("reference") + "), which you saved, closes in about "
                            + hours + " hour" + (hours == 1 ? "" : "s") + ". Apply through the employer's official route before then.");
            sent++;
        }
        return sent;
    }

    private List<Map<String, Object>> activeSubscriptions(String frequency) {
        return jdbc.queryForList(
                "select a.* from alert_subscriptions a join users u on u.id = a.user_id"
                        + " where a.active and a.frequency = ? and u.opportunity_alerts_enabled and u.status = 'ACTIVE'",
                frequency);
    }

    /**
     * Published listings matching the subscription since {@code since} that have not been announced to it yet,
     * recorded as delivered as they are claimed.
     */
    private List<Map<String, Object>> claim(Map<String, Object> sub, Instant since) {
        StringBuilder sql = new StringBuilder(
                "select o.id, o.title, o.organisation_name from opportunities o where o.status = 'PUBLISHED'"
                        + " and o.published_at >= ?"
                        + " and not exists (select 1 from alert_deliveries d where d.subscription_id = ? and d.opportunity_id = o.id)");
        List<Object> args = new ArrayList<>(List.of(Timestamp.from(since), sub.get("id")));
        if (sub.get("category_id") != null) {
            sql.append(" and o.category_id = ?");
            args.add(sub.get("category_id"));
        }
        if (sub.get("region") != null && !((String) sub.get("region")).isBlank()) {
            sql.append(" and (o.region = ? or o.region = 'National')");
            args.add(sub.get("region"));
        }
        if (sub.get("keyword") != null && !((String) sub.get("keyword")).isBlank()) {
            sql.append(" and (o.title ilike ? or o.organisation_name ilike ? or o.description ilike ?)");
            String like = "%" + ((String) sub.get("keyword")).trim().replace("%", "\\%").replace("_", "\\_") + "%";
            args.add(like);
            args.add(like);
            args.add(like);
        }
        sql.append(" order by o.published_at desc limit 50");

        List<Map<String, Object>> claimed = new ArrayList<>();
        for (Map<String, Object> match : jdbc.queryForList(sql.toString(), args.toArray())) {
            int inserted = jdbc.update(
                    "insert into alert_deliveries (subscription_id, opportunity_id) values (?, ?) on conflict do nothing",
                    sub.get("id"), match.get("id"));
            if (inserted == 1) {
                claimed.add(match);
            }
        }
        return claimed;
    }

    private boolean notify(UUID userId, List<Map<String, Object>> listings, String title) {
        var user = userRepository.findById(userId);
        if (user.isEmpty()) {
            return false;
        }
        StringBuilder body = new StringBuilder();
        listings.stream().limit(5).forEach(l -> body.append("• ")
                .append(l.get("title"))
                .append(" — ")
                .append(l.get("organisation_name"))
                .append('\n'));
        if (listings.size() > 5) {
            body.append("…and ").append(listings.size() - 5).append(" more on the opportunity board.");
        }
        try {
            notificationService.notify(
                    user.get(),
                    "JOB_ALERT",
                    title + " (" + listings.size() + ")",
                    body.toString().trim());
            return true;
        } catch (RuntimeException e) {
            log.warn("Could not deliver alert to user {}: {}", userId, e.getMessage());
            return false;
        }
    }

    private static Instant max(Instant a, Instant b) {
        return a.isAfter(b) ? a : b;
    }
}
