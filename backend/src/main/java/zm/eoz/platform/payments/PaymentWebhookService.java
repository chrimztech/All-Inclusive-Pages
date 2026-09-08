package zm.eoz.platform.payments;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ForbiddenException;
import zm.eoz.platform.servicecatalog.ServiceCatalogService;

/**
 * Verifies and applies gateway-agnostic payment webhooks. Each provider gets its own shared
 * secret; events are deduplicated by (provider, eventId) so a provider's retried delivery is
 * processed at most once, per the platform's idempotency requirement.
 */
@Service
public class PaymentWebhookService {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookService.class);

    private final PaymentWebhookEventRepository eventRepository;
    private final ServiceCatalogService serviceCatalogService;
    private final ObjectMapper objectMapper;
    private final String webhookSecret;

    public PaymentWebhookService(
            PaymentWebhookEventRepository eventRepository,
            ServiceCatalogService serviceCatalogService,
            ObjectMapper objectMapper,
            @Value("${eoz.payments.webhook-secret}") String webhookSecret) {
        this.eventRepository = eventRepository;
        this.serviceCatalogService = serviceCatalogService;
        this.objectMapper = objectMapper;
        this.webhookSecret = webhookSecret;
    }

    @Transactional
    public void handle(String provider, String signature, String rawBody) {
        if (!isValidSignature(signature, rawBody)) {
            throw new ForbiddenException("Invalid webhook signature.");
        }

        JsonNode node;
        try {
            node = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            throw new BadRequestException("Malformed webhook payload.");
        }

        String eventId = textOrThrow(node, "eventId");
        if (eventRepository.existsByProviderAndExternalEventId(provider, eventId)) {
            log.info("Ignoring already-processed webhook event {} from {}", eventId, provider);
            return;
        }
        eventRepository.save(new PaymentWebhookEvent(provider, eventId, rawBody));

        String status = textOrThrow(node, "status");
        if (!"SUCCEEDED".equals(status)) {
            log.info("Webhook event {} from {} has status {}, no invoice update applied", eventId, provider, status);
            return;
        }

        String invoiceReference = textOrThrow(node, "invoiceReference");
        java.math.BigDecimal amount = new java.math.BigDecimal(textOrThrow(node, "amount"));
        String providerReference = node.has("providerReference") ? node.get("providerReference").asText() : null;

        serviceCatalogService.recordPaymentFromWebhook(invoiceReference, amount, provider, providerReference);
    }

    private String textOrThrow(JsonNode node, String field) {
        if (!node.has(field)) {
            throw new BadRequestException("Webhook payload missing required field: " + field);
        }
        return node.get(field).asText();
    }

    private boolean isValidSignature(String signature, String rawBody) {
        if (signature == null || signature.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);
            return MessageDigest.isEqual(
                    computedHex.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC verification failed", e);
        }
    }
}
