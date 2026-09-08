package zm.eoz.platform.payments;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PaymentWebhookController {

    private final PaymentWebhookService paymentWebhookService;

    public PaymentWebhookController(PaymentWebhookService paymentWebhookService) {
        this.paymentWebhookService = paymentWebhookService;
    }

    @PostMapping("/api/v1/payments/webhook/{provider}")
    public ResponseEntity<Void> webhook(
            @PathVariable String provider, @RequestHeader("X-Signature") String signature, @RequestBody String rawBody) {
        paymentWebhookService.handle(provider, signature, rawBody);
        return ResponseEntity.ok().build();
    }
}
