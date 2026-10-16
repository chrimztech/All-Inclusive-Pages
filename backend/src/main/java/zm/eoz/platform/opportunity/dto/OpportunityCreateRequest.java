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
        String employmentType,
        String workArrangement,
        String experienceLevel,
        String opportunityValue,
        String opportunityValueUnit,
        java.math.BigDecimal salaryMin,
        java.math.BigDecimal salaryMax,
        boolean salaryVisible,
        Instant deadline,
        @NotNull String applicationMode,
        String applicationUrl,
        String applicationEmail,
        String applicationAddress,
        String source,
        /**
         * Registered organisation the listing is for. Staff with OPPORTUNITY_CREATE may post for any active
         * organisation; employers only for organisations they belong to. Omitted: the poster's own organisation,
         * or (staff) an unregistered one named in organisationName.
         */
        java.util.UUID organisationId,
        /** Publish straight away instead of queueing for review — only for people holding OPPORTUNITY_PUBLISH. */
        Boolean publishNow,
        /**
         * Staff posting for an organisation that is not on EOZ yet: also add it to the organisations directory as
         * unverified (or reuse an existing record with the same name) and link the listing to it.
         */
        Boolean addOrganisation) {}
