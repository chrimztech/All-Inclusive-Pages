package zm.eoz.platform.notification;

/**
 * Abstraction over an SMS gateway (e.g. Africa's Talking, Twilio). No live provider is wired up
 * yet — {@link LoggingSmsSender} is the only implementation until one is chosen and its
 * credentials are supplied, at which point a new {@code @Service} implementing this interface
 * replaces it with no changes needed at call sites.
 */
public interface SmsSender {
    void send(String phoneNumber, String message);
}
