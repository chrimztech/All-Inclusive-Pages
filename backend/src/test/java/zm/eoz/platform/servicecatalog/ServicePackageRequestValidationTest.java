package zm.eoz.platform.servicecatalog;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import zm.eoz.platform.servicecatalog.dto.ServicePackageRequest;

class ServicePackageRequestValidationTest {

    @Test
    void acceptsZeroForCustomQuotePackagesAndRejectsNegativePrices() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var customQuote = request(BigDecimal.ZERO);
            var negative = request(new BigDecimal("-0.01"));

            assertThat(validator.validate(customQuote)).isEmpty();
            assertThat(validator.validate(negative))
                    .extracting(violation -> violation.getPropertyPath().toString())
                    .containsExactly("price");
        }
    }

    private ServicePackageRequest request(BigDecimal price) {
        return new ServicePackageRequest(
                "recruitment-support",
                "Recruitment Support",
                "Custom-scoped recruitment support.",
                price,
                "ZMW",
                "Scope dependent",
                List.of("Requirements review", "Candidate sourcing"),
                true);
    }
}
