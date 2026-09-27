package zm.eoz.platform.security;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import zm.eoz.platform.common.exception.BadRequestException;

/**
 * Rules for passwords people choose (sign-up, reset, change, and staff-set passwords). Beyond length, a password
 * is refused when it contains the person's name or email, repeats one character, or appears in a breach corpus.
 *
 * <p>Breach checks use a {@link BreachedPasswordChecker}: by default a bundled list of the most common passwords;
 * with {@code BREACHED_PASSWORD_CHECK=hibp} also the Have I Been Pwned range API, which only ever receives the
 * first five characters of the password's SHA-1 hash (k-anonymity) and fails open if unreachable.
 */
@Slf4j
@Component
public class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 128;

    /** Interface for breach lookups, so another provider can be plugged in. */
    public interface BreachedPasswordChecker {
        boolean isBreached(String password);
    }

    private final Set<String> common;
    private final BreachedPasswordChecker remote;

    public PasswordPolicy(@Value("${eoz.password.breach-check:local}") String mode) {
        this.common = loadCommon();
        this.remote = "hibp".equalsIgnoreCase(mode) ? new HibpChecker() : null;
    }

    /** @throws BadRequestException explaining the first rule the password breaks */
    public void validate(String password, String email, String fullName) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new BadRequestException("Use at least " + MIN_LENGTH + " characters for your password.");
        }
        if (password.length() > MAX_LENGTH) {
            throw new BadRequestException("Use at most " + MAX_LENGTH + " characters for your password.");
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (lower.chars().distinct().count() <= 2) {
            throw new BadRequestException("That password is too easy to guess. Mix different characters.");
        }
        if (email != null) {
            String local = email.toLowerCase(Locale.ROOT).split("@")[0];
            if (local.length() >= 4 && lower.contains(local)) {
                throw new BadRequestException("Don't use your email address in your password.");
            }
        }
        if (fullName != null) {
            for (String part : fullName.toLowerCase(Locale.ROOT).split("\\s+")) {
                if (part.length() >= 5 && lower.contains(part)) {
                    throw new BadRequestException("Don't use your name in your password.");
                }
            }
        }
        if (common.contains(lower) || (remote != null && remote.isBreached(password))) {
            throw new BadRequestException(
                    "That password has appeared in data breaches, so attackers try it first. Choose a different one.");
        }
    }

    boolean isCommon(String password) {
        return common.contains(password.toLowerCase(Locale.ROOT));
    }

    private static Set<String> loadCommon() {
        Set<String> set = new HashSet<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource("security/common-passwords.txt").getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("#")) set.add(trimmed.toLowerCase(Locale.ROOT));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Could not load the common-password list", e);
        }
        return set;
    }

    /** Have I Been Pwned "range" lookup (https://haveibeenpwned.com/API/v3#PwnedPasswords). */
    static final class HibpChecker implements BreachedPasswordChecker {
        private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();

        @Override
        public boolean isBreached(String password) {
            try {
                String hash = HexFormat.of().withUpperCase().formatHex(
                        MessageDigest.getInstance("SHA-1").digest(password.getBytes(StandardCharsets.UTF_8)));
                String prefix = hash.substring(0, 5);
                String suffix = hash.substring(5);
                HttpResponse<String> response = http.send(
                        HttpRequest.newBuilder(URI.create("https://api.pwnedpasswords.com/range/" + prefix))
                                .timeout(Duration.ofSeconds(3))
                                .header("Add-Padding", "true")
                                .header("User-Agent", "EOZ-platform")
                                .build(),
                        HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) return false;
                return response.body().lines().anyMatch(line -> {
                    int colon = line.indexOf(':');
                    return colon > 0 && line.substring(0, colon).equalsIgnoreCase(suffix)
                            && !line.substring(colon + 1).trim().equals("0");
                });
            } catch (Exception e) {
                if (e instanceof InterruptedException) Thread.currentThread().interrupt();
                // Fail open: an outage of the lookup service must not stop people setting passwords.
                log.warn("Breached-password lookup unavailable: {}", e.getClass().getSimpleName());
                return false;
            }
        }
    }
}
