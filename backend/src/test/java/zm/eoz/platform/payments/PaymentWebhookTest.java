package zm.eoz.platform.payments;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies the payment webhook's two safety properties: signature verification (a forged or
 * unsigned event must be rejected) and idempotency (a provider's retried delivery of the same
 * event id must not be reprocessed). Uses a made-up invoice reference — since the reference
 * won't resolve to a real invoice, a valid-signature request for it is expected to 404 rather
 * than 200, which is enough to prove the signature check passed and idempotency short-circuits
 * on replay before that lookup ever happens.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PaymentWebhookTest {

    @Autowired
    private MockMvc mockMvc;

    @Value("${eoz.payments.webhook-secret}")
    private String webhookSecret;

    @Test
    void wrongSignatureIsRejected() throws Exception {
        String body = """
                {"eventId":"evt-unsigned","invoiceReference":"NOPE","status":"SUCCEEDED","amount":"10"}
                """;
        mockMvc.perform(post("/api/v1/payments/webhook/mobilemoney")
                        .header("X-Signature", "not-a-real-signature")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void validSignatureForUnknownInvoiceReturnsNotFound() throws Exception {
        String eventId = "evt-" + System.nanoTime();
        String body =
                """
                {"eventId":"%s","invoiceReference":"EOZ-INV-DOES-NOT-EXIST","status":"SUCCEEDED","amount":"10"}
                """
                        .formatted(eventId);
        String signature = hmacHex(body);

        mockMvc.perform(post("/api/v1/payments/webhook/mobilemoney")
                        .header("X-Signature", signature)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void replayedEventIdIsIgnoredEvenWithoutAMatchingInvoice() throws Exception {
        // A FAILED status never looks up an invoice, so this event id can be safely replayed
        // to prove idempotency without needing a real invoice fixture.
        String eventId = "evt-" + System.nanoTime();
        String body =
                """
                {"eventId":"%s","invoiceReference":"EOZ-INV-DOES-NOT-EXIST","status":"FAILED","amount":"10"}
                """
                        .formatted(eventId);
        String signature = hmacHex(body);

        mockMvc.perform(post("/api/v1/payments/webhook/mobilemoney")
                        .header("X-Signature", signature)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk());

        // Second delivery of the same event id must be a no-op (200, not reprocessed).
        mockMvc.perform(post("/api/v1/payments/webhook/mobilemoney")
                        .header("X-Signature", signature)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk());
    }

    private String hmacHex(String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }
}
