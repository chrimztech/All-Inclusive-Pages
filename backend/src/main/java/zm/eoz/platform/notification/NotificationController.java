package zm.eoz.platform.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.exception.ForbiddenException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.notification.dto.NotificationResponse;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /** Newest first. {@code limit} caps the result, e.g. for the header bell's dropdown. */
    @GetMapping("/mine")
    public ApiResponse<List<NotificationResponse>> mine(@RequestParam(required = false) Integer limit) {
        List<Notification> notifications = limit != null && limit > 0
                ? notificationRepository
                        .findByUserIdOrderByCreatedAtDesc(currentUserId(), PageRequest.of(0, Math.min(limit, 100)))
                        .getContent()
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUserId());
        return ApiResponse.of(notifications.stream().map(NotificationResponse::from).toList());
    }

    @PostMapping("/mine/read-all")
    @Transactional
    public ApiResponse<Integer> markAllRead() {
        return ApiResponse.of(notificationRepository.markAllRead(currentUserId()));
    }

    @GetMapping("/mine/unread-count")
    public ApiResponse<Long> unreadCount() {
        return ApiResponse.of(notificationRepository.countByUserIdAndReadFalse(currentUserId()));
    }

    @PostMapping("/{id}/read")
    public ApiResponse<NotificationResponse> markRead(@PathVariable UUID id) {
        Notification notification =
                notificationRepository.findById(id).orElseThrow(() -> new NotFoundException("Notification not found: " + id));
        if (!notification.getUser().getId().equals(currentUserId())) {
            throw new ForbiddenException("This notification does not belong to you.");
        }
        notification.setRead(true);
        return ApiResponse.of(NotificationResponse.from(notificationRepository.save(notification)));
    }

    private UUID currentUserId() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId();
    }
}
