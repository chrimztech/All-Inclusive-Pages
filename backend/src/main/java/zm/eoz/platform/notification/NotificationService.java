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
    private final UnsubscribeService unsubscribeService;

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationTemplateService templateService,
            EmailDeliveryService deliveryService,
            UnsubscribeService unsubscribeService) {
        this.notificationRepository = notificationRepository;
        this.templateService = templateService;
        this.deliveryService = deliveryService;
        this.unsubscribeService = unsubscribeService;
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
        String emailBody = NotificationTemplateService.render(template.bodyTemplate(), user.getFullName(), title, body);
        String oneClickUrl = null;
        // Optional email carries a sign-in-free unsubscribe link and a one-click List-Unsubscribe header.
        UnsubscribeService.Scope scope = UnsubscribeService.scopeFor(type);
        if (scope != null) {
            emailBody += "\n\n--\n"
                    + (scope == UnsubscribeService.Scope.ALERTS
                            ? "You receive job alerts because you turned them on."
                            : "You receive service updates because you use EOZ professional services.")
                    + " Unsubscribe: " + unsubscribeService.pageUrl(user.getId(), scope);
            oneClickUrl = unsubscribeService.oneClickUrl(user.getId(), scope);
        }
        deliveryService.enqueue(
                notification.getId(),
                type,
                user.getEmail(),
                NotificationTemplateService.render(template.subjectTemplate(), user.getFullName(), title, body),
                emailBody,
                oneClickUrl);
    }
}
