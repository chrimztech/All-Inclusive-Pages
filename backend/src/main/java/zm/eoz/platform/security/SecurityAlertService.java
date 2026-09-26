package zm.eoz.platform.security;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.notification.NotificationService;

/**
 * Tells administrators about security-relevant events — account lockouts after repeated failed sign-ins,
 * privilege and status changes, unusual export volumes — through the normal notification channel, so alerts are
 * in the bell, in email (via the retrying outbox) and in the log.
 */
@Service
public class SecurityAlertService {

    private static final Logger log = LoggerFactory.getLogger(SecurityAlertService.class);

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public SecurityAlertService(JdbcTemplate jdbc, UserRepository userRepository, NotificationService notificationService) {
        this.jdbc = jdbc;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public void alertAdministrators(String title, String body) {
        log.warn("SECURITY ALERT: {} — {}", title, body);
        List<UUID> adminIds = jdbc.queryForList(
                "select distinct ur.user_id from user_roles ur join roles r on r.id = ur.role_id join users u on u.id = ur.user_id"
                        + " where r.name = 'ADMIN' and u.status = 'ACTIVE'",
                UUID.class);
        for (var admin : userRepository.findAllById(adminIds)) {
            notificationService.notify(admin, "SECURITY_ALERT", title, body);
        }
    }
}
