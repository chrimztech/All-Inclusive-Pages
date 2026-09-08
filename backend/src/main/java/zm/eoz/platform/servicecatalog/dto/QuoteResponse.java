package zm.eoz.platform.servicecatalog.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.servicecatalog.Quote;

public record QuoteResponse(UUID id, BigDecimal amount, String currency, Instant issuedAt, Instant acceptedAt) {
    public static QuoteResponse from(Quote q) {
        return new QuoteResponse(q.getId(), q.getAmount(), q.getCurrency(), q.getIssuedAt(), q.getAcceptedAt());
    }
}
