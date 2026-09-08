package zm.eoz.platform.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.identity.User;

/**
 * Writes an in-app notification and makes a best-effort attempt to also email it.
 * Email failures are logged and swallowed — the in-app record is the source of truth,
 * since no local SMTP relay is assumed to be running in dev.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    public NotificationService(NotificationRepository notificationRepository, JavaMailSender mailSender) {
        this.notificationRepository = notificationRepository;
        this.mailSender = mailSender;
    }

    @Transactional
    public void notify(User user, String type, String title, String body) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setBody(body);
        notificationRepository.save(notification);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject(title);
            message.setText(body != null ? body : title);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Email delivery skipped for notification '{}' to {}: {}", title, user.getEmail(), e.getMessage());
        }
    }
}
