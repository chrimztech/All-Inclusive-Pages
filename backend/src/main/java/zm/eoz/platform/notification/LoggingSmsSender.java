package zm.eoz.platform.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Default {@link SmsSender}: logs instead of sending, since no gateway is configured. */
@Service
public class LoggingSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsSender.class);

    @Override
    public void send(String phoneNumber, String message) {
        log.info("SMS (no gateway configured, not sent) to {}: {}", phoneNumber, message);
    }
}
