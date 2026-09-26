package zm.eoz.platform.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/** Pure unit tests: RFC 6238 test vectors, replay protection, and the sliding-window rate limiter. */
class TotpAndRateLimitTest {

    private final TotpService totp = new TotpService();
    /** RFC 6238 Appendix B secret "12345678901234567890". */
    private final String rfcSecret = TotpService.base32("12345678901234567890".getBytes(StandardCharsets.US_ASCII));

    @Test
    void matchesRfc6238TestVectors() {
        assertThat(rfcSecret).isEqualTo("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
        // RFC gives 8-digit codes; the last 6 digits are the 6-digit code.
        assertThat(totp.codeAt(rfcSecret, 59 / 30)).isEqualTo("287082");
        assertThat(totp.codeAt(rfcSecret, 1111111109L / 30)).isEqualTo("081804");
        assertThat(totp.codeAt(rfcSecret, 1234567890L / 30)).isEqualTo("005924");
    }

    @Test
    void acceptsOneStepOfDriftAndRejectsReplays() {
        Instant now = Instant.ofEpochSecond(1_700_000_000L);
        long step = now.getEpochSecond() / 30;
        String current = totp.codeAt(rfcSecret, step);
        assertThat(totp.verify(rfcSecret, current, null, now)).isEqualTo(step);
        assertThat(totp.verify(rfcSecret, totp.codeAt(rfcSecret, step - 1), null, now)).isEqualTo(step - 1);
        assertThat(totp.verify(rfcSecret, totp.codeAt(rfcSecret, step - 3), null, now)).isEqualTo(-1);
        // Once a step is used it cannot be used again.
        assertThat(totp.verify(rfcSecret, current, step, now)).isEqualTo(-1);
        assertThat(totp.verify(rfcSecret, "12345", null, now)).isEqualTo(-1);
        assertThat(totp.verify(rfcSecret, "abcdef", null, now)).isEqualTo(-1);
    }

    @Test
    void base32RoundTrips() {
        String secret = totp.newSecret();
        assertThat(secret).hasSize(32).matches("[A-Z2-7]+");
        assertThat(TotpService.base32(TotpService.base32Decode(secret))).isEqualTo(secret);
    }

    @Test
    void rateLimiterAllowsUpToTheLimitPerWindow() {
        RateLimitFilter limiter = new RateLimitFilter(3, 3);
        long t = 1_000_000L;
        assertThat(limiter.allow("auth|1.2.3.4", 3, t)).isTrue();
        assertThat(limiter.allow("auth|1.2.3.4", 3, t + 1)).isTrue();
        assertThat(limiter.allow("auth|1.2.3.4", 3, t + 2)).isTrue();
        assertThat(limiter.allow("auth|1.2.3.4", 3, t + 3)).isFalse();
        // Other clients have their own budget.
        assertThat(limiter.allow("auth|5.6.7.8", 3, t + 3)).isTrue();
        // The window slides.
        assertThat(limiter.allow("auth|1.2.3.4", 3, t + 60_001)).isTrue();
    }
}
