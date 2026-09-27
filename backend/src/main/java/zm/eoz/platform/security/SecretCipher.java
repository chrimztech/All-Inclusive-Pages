package zm.eoz.platform.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Encrypts small secrets stored in the database (two-step verification keys) with AES-256-GCM.
 * Stored form: {@code v1:} + base64(12-byte IV + ciphertext + tag). Values without the prefix are
 * treated as legacy plaintext and returned unchanged, so existing rows keep working.
 *
 * <p>The key comes from {@code EOZ_DATA_KEY}. Without it, a key is derived from the JWT secret —
 * then rotating the JWT secret makes stored two-step keys unreadable, so set EOZ_DATA_KEY in production.
 */
@Slf4j
@Component
public class SecretCipher {

    static final String PREFIX = "v1:";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(@Value("${eoz.data-key:}") String dataKey, @Value("${eoz.jwt.secret}") String jwtSecret) {
        String material;
        if (dataKey == null || dataKey.isBlank()) {
            log.warn("EOZ_DATA_KEY is not set; deriving the data-encryption key from JWT_SECRET. "
                    + "Set EOZ_DATA_KEY in production so rotating the JWT secret does not lock out two-step users.");
            material = "eoz-data-key:" + jwtSecret;
        } else {
            material = dataKey;
        }
        this.key = new SecretKeySpec(sha256(material), "AES");
    }

    public String encrypt(String plain) {
        if (plain == null) return null;
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] body = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + body.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(body, 0, out, iv.length, body.length);
            return PREFIX + Base64.getEncoder().encodeToString(out);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not encrypt secret", e);
        }
    }

    public String decrypt(String stored) {
        if (stored == null || !isEncrypted(stored)) return stored;
        try {
            byte[] in = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, in, 0, IV_BYTES));
            return new String(cipher.doFinal(in, IV_BYTES, in.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException(
                    "Could not decrypt a stored secret. Was EOZ_DATA_KEY (or JWT_SECRET, if no data key is set) changed?", e);
        }
    }

    public static boolean isEncrypted(String stored) {
        return stored != null && stored.startsWith(PREFIX);
    }

    private static byte[] sha256(String s) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
