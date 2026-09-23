package zm.eoz.platform.organisation.dto;

import java.util.UUID;

public record OrganisationResponse(
        UUID id,
        String legalName,
        String tradingName,
        String registrationNumber,
        String sector,
        String size,
        String website,
        String address,
        String description,
        String verificationStatus,
        long listingsCount,
        UUID logoFileId,
        String businessType,
        String sizeBand,
        String tpin,
        Integer foundedYear,
        String contactPersonName,
        String contactPersonRole,
        String contactPhone,
        String linkedinUrl,
        String facebookUrl) {

    public static OrganisationResponse from(zm.eoz.platform.organisation.Organisation org, long listingsCount) {
        return new OrganisationResponse(
                org.getId(),
                org.getLegalName(),
                org.getTradingName(),
                org.getRegistrationNumber(),
                org.getSector(),
                org.getSize(),
                org.getWebsite(),
                org.getAddress(),
                org.getDescription(),
                org.getVerificationStatus().name(),
                listingsCount,
                org.getLogoFileId(),
                org.getBusinessType() != null ? org.getBusinessType().name() : null,
                org.getSizeBand() != null ? org.getSizeBand().name() : null,
                org.getTpin(),
                org.getFoundedYear(),
                org.getContactPersonName(),
                org.getContactPersonRole(),
                org.getContactPhone(),
                org.getLinkedinUrl(),
                org.getFacebookUrl());
    }
}
