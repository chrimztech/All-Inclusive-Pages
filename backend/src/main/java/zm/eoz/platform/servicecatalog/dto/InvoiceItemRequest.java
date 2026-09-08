package zm.eoz.platform.servicecatalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record InvoiceItemRequest(
        @NotBlank String description, @Positive int quantity, @NotNull @Positive BigDecimal unitPrice, BigDecimal taxRate) {}
