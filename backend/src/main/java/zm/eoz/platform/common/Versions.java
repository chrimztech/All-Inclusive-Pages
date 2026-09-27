package zm.eoz.platform.common;

import zm.eoz.platform.common.exception.ConflictException;

/**
 * If-Match handling for edits: the client sends the version it loaded (as {@code If-Match: "7"} or {@code 7});
 * if the record has changed since, the edit is refused instead of silently overwriting someone else's work.
 * Requests without If-Match are accepted, for older clients.
 */
public final class Versions {

    private Versions() {}

    public static void check(String ifMatch, Long current, String what) {
        if (ifMatch == null || ifMatch.isBlank() || current == null) return;
        String value = ifMatch.trim();
        if (value.startsWith("W/")) value = value.substring(2);
        value = value.replace("\"", "");
        long expected;
        try {
            expected = Long.parseLong(value);
        } catch (NumberFormatException e) {
            return; // not one of our version tags; ignore rather than block the edit
        }
        if (expected != current) {
            throw new ConflictException("Someone else changed this " + what + " after you opened it. Reload to see"
                    + " their changes, then make yours again.");
        }
    }
}
