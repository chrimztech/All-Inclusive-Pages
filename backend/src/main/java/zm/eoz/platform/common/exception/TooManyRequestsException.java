package zm.eoz.platform.common.exception;

/** Rate limit or account lockout: rendered as HTTP 429 with the message shown to the user. */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
