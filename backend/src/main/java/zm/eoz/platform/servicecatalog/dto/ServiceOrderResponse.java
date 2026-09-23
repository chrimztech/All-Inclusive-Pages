package zm.eoz.platform.servicecatalog.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.servicecatalog.Quote;
import zm.eoz.platform.servicecatalog.ServiceOrder;

public record ServiceOrderResponse(
        UUID id,
        String reference,
        String packageSlug,
        String packageName,
        String customerName,
        String status,
        String requirements,
        String assignedOfficerName,
        int revisionCount,
        BigDecimal latestQuoteAmount,
        String latestQuoteCurrency,
        boolean latestQuoteAccepted,
        Instant createdAt,
        Instant updatedAt) {

    public static ServiceOrderResponse from(ServiceOrder o, Quote latestQuote) {
        return new ServiceOrderResponse(
                o.getId(),
                o.getReference(),
                o.getServicePackage().getSlug(),
                o.getServicePackage().getName(),
                o.getCustomer().getFullName(),
                o.getStatus().name(),
                o.getRequirements(),
                o.getAssignedOfficer() != null ? o.getAssignedOfficer().getFullName() : null,
                o.getRevisionCount(),
                latestQuote != null ? latestQuote.getAmount() : null,
                latestQuote != null ? latestQuote.getCurrency() : null,
                latestQuote != null && latestQuote.getAcceptedAt() != null,
                o.getCreatedAt(),
                o.getUpdatedAt());
    }
}
