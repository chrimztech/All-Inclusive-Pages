package zm.eoz.platform.opportunity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record OpportunityCreateRequest(
        @NotBlank String title,
        @NotBlank String categoryCode,
        @NotBlank String organisationName,
        @NotBlank String description,
        String responsibilities,
        String requirements,
        String benefits,
        String location,
        String region,
        String workMode,
        String opportunityValue,
        String opportunityValueUnit,
        boolean salaryVisible,
        Instant deadline,
        @NotNull String applicationMode,
        String applicationUrl,
        String applicationEmail,
        String applicationAddress,
        String source) {}
