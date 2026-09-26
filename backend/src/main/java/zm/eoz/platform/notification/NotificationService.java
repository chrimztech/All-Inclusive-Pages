package zm.eoz.platform.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private final NotificationTemplateService templateService;
    private final EmailDeliveryService deliveryService;

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationTemplateService templateService,
            EmailDeliveryService deliveryService) {
        this.notificationRepository = notificationRepository;
        this.templateService = templateService;
        this.deliveryService = deliveryService;
    }

    /**
     * Records the in-app notification and, when the template and the recipient's preferences allow, queues its
     * email in the same transaction. Sending happens in the background with retries (see EmailDeliveryService).
     */
    @Transactional
    public void notify(User user, String type, String title, String body) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setBody(body);
        notification = notificationRepository.saveAndFlush(notification);

        var template = templateService.get(type);
        if (!template.emailEnabled()) {
            return;
        }
        if (NotificationTemplateService.SERVICE_TYPES.contains(type) && !user.isServiceCommsEnabled()) {
            return;
        }
        deliveryService.enqueue(
                notification.getId(),
                type,
                user.getEmail(),
                NotificationTemplateService.render(template.subjectTemplate(), user.getFullName(), title, body),
                NotificationTemplateService.render(template.bodyTemplate(), user.getFullName(), title, body));
    }
}
