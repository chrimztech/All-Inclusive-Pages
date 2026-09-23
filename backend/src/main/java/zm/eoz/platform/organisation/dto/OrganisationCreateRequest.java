package zm.eoz.platform.organisation.dto;

import jakarta.validation.constraints.NotBlank;

public record OrganisationCreateRequest(
        @NotBlank String legalName,
        String tradingName,
        String registrationNumber,
        String sector,
        String size,
        String website,
        String address,
        String businessType,
        String sizeBand,
        String tpin,
        Integer foundedYear,
        String contactPersonName,
        String contactPersonRole,
        String contactPhone,
        String linkedinUrl,
        String facebookUrl) {

    public OrganisationCreateRequest(
            String legalName, String tradingName, String registrationNumber, String sector, String size, String website, String address) {
        this(legalName, tradingName, registrationNumber, sector, size, website, address, null, null, null, null, null, null, null, null, null);
    }
}
