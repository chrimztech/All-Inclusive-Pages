package zm.eoz.platform.organisation.dto;

import jakarta.validation.constraints.NotBlank;

public record OrganisationCreateRequest(
        @NotBlank String legalName, String tradingName, String registrationNumber, String sector, String size, String website, String address) {}
