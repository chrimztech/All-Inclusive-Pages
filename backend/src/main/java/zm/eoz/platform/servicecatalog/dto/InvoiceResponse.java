package zm.eoz.platform.servicecatalog.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.servicecatalog.Invoice;

public record InvoiceResponse(
        UUID id,
        String reference,
        UUID orderId,
        String orderReference,
        String packageName,
        String customerName,
        BigDecimal amount,
        String currency,
        String status,
        Instant issuedAt,
        Instant dueAt,
        Instant paidAt) {
    public static InvoiceResponse from(Invoice i) {
        return new InvoiceResponse(
                i.getId(),
                i.getReference(),
                i.getOrder().getId(),
                i.getOrder().getReference(),
                i.getOrder().getServicePackage().getName(),
                i.getOrder().getCustomer().getFullName(),
                i.getAmount(),
                i.getCurrency(),
                i.getStatus().name(),
                i.getIssuedAt(),
                i.getDueAt(),
                i.getPaidAt());
    }
}
