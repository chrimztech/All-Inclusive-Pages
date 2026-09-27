package zm.eoz.platform.notification;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.auth.ConsentService;
import zm.eoz.platform.common.exception.BadRequestException;

/**
 * Signed, sign-in-free unsubscribe links for optional email (job alerts and service updates).
 * A token is {@code base64url(userId:scope).base64url(HMAC-SHA256)}. It does not expire: mailbox providers and
 * consumer-protection rules expect an unsubscribe link to keep working. Account-security email has no link.
 */
@Service
public class UnsubscribeService {

    /** ALERTS: job alerts and deadline reminders. SERVICE: service and billing updates. ALL: both. */
    public enum Scope { ALERTS, SERVICE, ALL }

    public record Status(Scope scope, String maskedEmail, boolean alertsEnabled, boolean serviceEnabled) {}

    private final JdbcTemplate jdbc;
    private final ConsentService consentService;
    private final SecretKeySpec key;
    private final String webUrl;
    private final String apiUrl;

    public UnsubscribeService(
            JdbcTemplate jdbc,
            ConsentService consentService,
            @Value("${eoz.jwt.secret}") String jwtSecret,
            @Value("${eoz.public-web-url:http://localhost:8082}") String webUrl,
            @Value("${eoz.public-api-url:http://localhost:8081/api/v1}") String apiUrl) {
        this.jdbc = jdbc;
        this.consentService = consentService;
        this.key = new SecretKeySpec(sha256("eoz-unsubscribe:" + jwtSecret), "HmacSHA256");
        this.webUrl = stripSlash(webUrl);
        this.apiUrl = stripSlash(apiUrl);
    }

    /** The preference an email type falls under, or null when it cannot be unsubscribed from. */
    public static Scope scopeFor(String notificationType) {
        if ("JOB_ALERT".equals(notificationType) || "DEADLINE_REMINDER".equals(notificationType)) return Scope.ALERTS;
        if (NotificationTemplateService.SERVICE_TYPES.contains(notificationType)) return Scope.SERVICE;
        return null;
    }

    public String token(UUID userId, Scope scope) {
        String payload = userId + ":" + scope.name();
        return b64(payload.getBytes(StandardCharsets.UTF_8)) + "." + b64(sign(payload));
    }

    /** Page a person opens from the email footer. */
    public String pageUrl(UUID userId, Scope scope) {
        return webUrl + "/unsubscribe?token=" + token(userId, scope);
    }

    /** Endpoint mail clients POST to for one-click unsubscribe (RFC 8058). */
    public String oneClickUrl(UUID userId, Scope scope) {
        return apiUrl + "/unsubscribe?token=" + token(userId, scope);
    }

    public Status status(String token) {
        Parsed p = parse(token);
        return load(p.userId(), p.scope());
    }

    /**
     * Turns the token's preference off. An ALL token may narrow to one scope via {@code only}. Idempotent, and
     * each real change is written to the consent history.
     */
    @Transactional
    public Status unsubscribe(String token, Scope only) {
        Parsed p = parse(token);
        Scope scope = only != null && p.scope() == Scope.ALL ? only : p.scope();
        return set(p.userId(), scope, false, p.scope());
    }

    /** Undo for someone who clicked by mistake. Restores only what the token covers. */
    @Transactional
    public Status resubscribe(String token) {
        Parsed p = parse(token);
        return set(p.userId(), p.scope(), true, p.scope());
    }

    private Status set(UUID userId, Scope scope, boolean enabled, Scope tokenScope) {
        Status before = load(userId, tokenScope);
        String source = enabled ? "EMAIL_RESUBSCRIBE" : "EMAIL_UNSUBSCRIBE";
        if ((scope == Scope.ALERTS || scope == Scope.ALL) && before.alertsEnabled() != enabled) {
            jdbc.update("update users set opportunity_alerts_enabled = ? where id = ?", enabled, userId);
            consentService.record(userId, ConsentService.Type.OPPORTUNITY_ALERTS, enabled, source);
        }
        if ((scope == Scope.SERVICE || scope == Scope.ALL) && before.serviceEnabled() != enabled) {
            jdbc.update("update users set service_comms_enabled = ? where id = ?", enabled, userId);
            consentService.record(userId, ConsentService.Type.SERVICE_COMMS, enabled, source);
        }
        return load(userId, tokenScope);
    }

    private Status load(UUID userId, Scope scope) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "select email, opportunity_alerts_enabled, service_comms_enabled from users where id = ?", userId);
        if (rows.isEmpty()) throw new BadRequestException("This unsubscribe link is no longer valid.");
        Map<String, Object> r = rows.get(0);
        return new Status(scope, mask((String) r.get("email")),
                (Boolean) r.get("opportunity_alerts_enabled"), (Boolean) r.get("service_comms_enabled"));
    }

    private record Parsed(UUID userId, Scope scope) {}

    private Parsed parse(String token) {
        try {
            String[] parts = token == null ? new String[0] : token.split("\\.");
            if (parts.length != 2) throw new IllegalArgumentException("shape");
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(sign(payload), Base64.getUrlDecoder().decode(parts[1]))) {
                throw new IllegalArgumentException("signature");
            }
            String[] fields = payload.split(":");
            return new Parsed(UUID.fromString(fields[0]), Scope.valueOf(fields[1]));
        } catch (IllegalArgumentException | ArrayIndexOutOfBoundsException e) {
            throw new BadRequestException(
                    "This unsubscribe link is not valid. You can change email preferences from your account instead.");
        }
    }

    static String mask(String email) {
        if (email == null) return "";
        int at = email.indexOf('@');
        if (at < 0) return "***";
        return (at <= 1 ? "" : email.substring(0, 1)) + "***" + email.substring(at);
    }

    private byte[] sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static byte[] sha256(String s) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String stripSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }
}
