package zm.eoz.platform.notification;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;

/** Email outbox visibility for staff: what is queued, retrying, sent or dead, and a manual retry. */
@RestController
@RequestMapping("/api/v1/admin/notifications/deliveries")
@PreAuthorize("hasAuthority('STAFF_INBOX_MANAGE')")
public class EmailDeliveryController {

    private final EmailDeliveryService deliveryService;

    public EmailDeliveryController(EmailDeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @GetMapping
    public ApiResponse<List<EmailDeliveryService.Delivery>> list(
            @RequestParam(required = false) String status, @RequestParam(defaultValue = "100") int limit) {
        return ApiResponse.of(deliveryService.list(status, limit));
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Long>> summary() {
        return ApiResponse.of(deliveryService.summary());
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<Void> retry(@PathVariable UUID id) {
        deliveryService.retry(id);
        return ResponseEntity.noContent().build();
    }
}
