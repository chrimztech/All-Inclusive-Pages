package zm.eoz.platform.notification;

import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;

/** Staff-wide visibility into the notification feed — real counts only, no fabricated delivery metrics. */
@RestController
@RequestMapping("/api/v1/admin/notifications")
@PreAuthorize("hasAuthority('STAFF_INBOX_MANAGE')")
public class AdminNotificationController {

    private final NotificationRepository notificationRepository;

    public AdminNotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public record NotificationRow(UUID id, String recipientName, String type, String title, boolean read, java.time.Instant createdAt) {
        static NotificationRow from(Notification n) {
            return new NotificationRow(n.getId(), n.getUser().getFullName(), n.getType(), n.getTitle(), n.isRead(), n.getCreatedAt());
        }
    }

    public record NotificationSummary(long total, long unread) {}

    @GetMapping
    public ApiResponse<PageResponse<NotificationRow>> list(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(notificationRepository.findAllByOrderByCreatedAtDesc(pageable).map(NotificationRow::from)));
    }

    @GetMapping("/summary")
    public ApiResponse<NotificationSummary> summary() {
        return ApiResponse.of(new NotificationSummary(notificationRepository.count(), notificationRepository.countByReadFalse()));
    }
}
