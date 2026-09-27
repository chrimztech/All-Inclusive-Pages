package zm.eoz.platform.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Background jobs (email outbox, exports, alerts, backups, retention). On unless {@code eoz.scheduling.enabled=false}:
 * the test profile turns them off so tests drive jobs explicitly instead of racing them.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "eoz.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {}
