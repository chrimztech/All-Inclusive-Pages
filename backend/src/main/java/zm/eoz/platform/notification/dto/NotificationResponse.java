package zm.eoz.platform.notification.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.notification.Notification;

public record NotificationResponse(UUID id, String type, String title, String body, boolean read, Instant createdAt) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.isRead(), n.getCreatedAt());
    }
}
