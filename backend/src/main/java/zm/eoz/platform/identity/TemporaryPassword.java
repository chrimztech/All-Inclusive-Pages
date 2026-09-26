package zm.eoz.platform.identity;

import java.security.SecureRandom;

/** Generates one-time passwords for administrator-created accounts. Avoids look-alike characters (0/O, 1/l/I). */
public final class TemporaryPassword {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String ALL = UPPER + LOWER + DIGITS;

    private TemporaryPassword() {}

    public static String generate() {
        char[] out = new char[12];
        out[0] = pick(UPPER);
        out[1] = pick(LOWER);
        out[2] = pick(DIGITS);
        for (int i = 3; i < out.length; i++) {
            out[i] = pick(ALL);
        }
        for (int i = out.length - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return new String(out);
    }

    private static char pick(String alphabet) {
        return alphabet.charAt(RANDOM.nextInt(alphabet.length()));
    }
}
