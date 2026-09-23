package zm.eoz.platform.organisation.dto;

import jakarta.validation.constraints.NotBlank;

public record OrganisationUpdateRequest(
        @NotBlank String legalName,
        String tradingName,
        String registrationNumber,
        String sector,
        String size,
        String website,
        String address,
        String description,
        String businessType,
        String sizeBand,
        String tpin,
        Integer foundedYear,
        String contactPersonName,
        String contactPersonRole,
        String contactPhone,
        String linkedinUrl,
        String facebookUrl) {}
