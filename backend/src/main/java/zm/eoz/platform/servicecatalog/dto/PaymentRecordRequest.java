package zm.eoz.platform.servicecatalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record PaymentRecordRequest(
        @NotNull @Positive BigDecimal amount, @NotBlank String method, String providerReference) {}
