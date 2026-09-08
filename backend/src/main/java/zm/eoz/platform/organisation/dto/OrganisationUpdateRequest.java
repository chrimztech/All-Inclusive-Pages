package zm.eoz.platform.organisation.dto;

import jakarta.validation.constraints.NotBlank;

public record OrganisationUpdateRequest(
        @NotBlank String legalName,
        String tradingName,
        String sector,
        String website,
        String address,
        String description) {}
