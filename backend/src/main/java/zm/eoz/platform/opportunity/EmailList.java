package zm.eoz.platform.opportunity;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Pattern;
import zm.eoz.platform.common.exception.BadRequestException;

/** A listing's application email addresses, stored as one comma-separated string per field (To, CC, BCC). */
final class EmailList {

    /** Most addresses one listing can carry across To, CC and BCC. */
    static final int MAX_ADDRESSES = 10;

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s,;<>]+@[^@\\s,;<>]+\\.[^@\\s,;<>]+$");

    private EmailList() {}

    /**
     * The addresses in {@code raw} (separated by commas, semicolons or spaces), checked, de-duplicated and joined as
     * "a@x.zm, b@y.zm"; null when there are none.
     */
    static String normalise(String raw, String label) {
        if (raw == null || raw.isBlank()) return null;
        Set<String> addresses = new LinkedHashSet<>();
        for (String part : raw.split("[,;\\s]+")) {
            String address = part.trim();
            if (address.isEmpty()) continue;
            if (!EMAIL.matcher(address).matches()) {
                throw new BadRequestException("\"" + address + "\" isn't a valid " + label + " email address.");
            }
            addresses.add(address);
        }
        return addresses.isEmpty() ? null : String.join(", ", addresses);
    }

    static int count(String normalised) {
        return normalised == null ? 0 : normalised.split(", ").length;
    }

    static void requireWithinLimit(String to, String cc, String bcc) {
        if (count(to) + count(cc) + count(bcc) > MAX_ADDRESSES) {
            throw new BadRequestException("A listing can have at most " + MAX_ADDRESSES + " application email addresses.");
        }
    }
}
