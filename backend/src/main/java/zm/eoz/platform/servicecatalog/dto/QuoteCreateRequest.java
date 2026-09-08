package zm.eoz.platform.servicecatalog.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record QuoteCreateRequest(@NotNull @Positive BigDecimal amount) {}
