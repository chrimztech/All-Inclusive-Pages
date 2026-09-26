package zm.eoz.platform.privacy;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import zm.eoz.platform.export.ExportService;

/**
 * Retention clean-up, run daily and on demand. Each step is idempotent: it only removes what is past its retention
 * window, so repeated or overlapping runs are harmless.
 *
 * <ul>
 *   <li>Sessions: revoked or expired refresh tokens after 30 days.</li>
 *   <li>Email-verification and password-reset tokens: 7 days after expiry.</li>
 *   <li>Two-step sign-in challenges: 1 day after expiry.</li>
 *   <li>Sent email records: 90 days. Failed ("dead") ones are kept for investigation.</li>
 *   <li>Read in-app notifications: 1 year.</li>
 *   <li>Export files: 7 days after creation.</li>
 *   <li>Account deletion requests: erased when their grace period ends.</li>
 * </ul>
 */
@Service
public class RetentionService {

    private static final Logger log = LoggerFactory.getLogger(RetentionService.class);

    private final JdbcTemplate jdbc;
    private final ExportService exportService;
    private final PrivacyService privacyService;

    public RetentionService(JdbcTemplate jdbc, ExportService exportService, PrivacyService privacyService) {
        this.jdbc = jdbc;
        this.exportService = exportService;
        this.privacyService = privacyService;
    }

    public Map<String, Integer> run() {
        Map<String, Integer> result = new LinkedHashMap<>();
        result.put("sessions", jdbc.update(
                "delete from refresh_tokens where (revoked or expires_at < now()) and created_at < now() - interval '30 days'"));
        result.put("verificationTokens", jdbc.update(
                "delete from verification_tokens where expires_at < now() - interval '7 days'"));
        result.put("mfaChallenges", jdbc.update("delete from mfa_challenges where expires_at < now() - interval '1 day'"));
        result.put("sentEmails", jdbc.update(
                "delete from notification_deliveries where status = 'SENT' and sent_at < now() - interval '90 days'"));
        result.put("readNotifications", jdbc.update(
                "delete from notifications where read and created_at < now() - interval '365 days'"));
        result.put("exports", exportService.expireOld());
        int erased = 0;
        for (UUID id : privacyService.dueRequestIds()) {
            try {
                privacyService.complete(id, null);
                erased++;
            } catch (RuntimeException e) {
                log.error("Could not complete privacy request {}", id, e);
            }
        }
        result.put("accountsErased", erased);
        log.info("Retention clean-up: {}", result);
        return result;
    }
}
