package zm.eoz.platform.servicecatalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.List;

public record ServicePackageRequest(
        @NotBlank String slug,
        @NotBlank String name,
        String description,
        @NotNull @PositiveOrZero BigDecimal price,
        String currency,
        String turnaround,
        List<String> includes,
        Boolean active) {}
