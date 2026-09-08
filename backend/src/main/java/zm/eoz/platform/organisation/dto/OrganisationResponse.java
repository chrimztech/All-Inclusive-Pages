package zm.eoz.platform.organisation.dto;

import java.util.UUID;

public record OrganisationResponse(
        UUID id,
        String legalName,
        String tradingName,
        String sector,
        String website,
        String address,
        String description,
        String verificationStatus,
        long listingsCount) {

    public static OrganisationResponse from(zm.eoz.platform.organisation.Organisation org, long listingsCount) {
        return new OrganisationResponse(
                org.getId(),
                org.getLegalName(),
                org.getTradingName(),
                org.getSector(),
                org.getWebsite(),
                org.getAddress(),
                org.getDescription(),
                org.getVerificationStatus().name(),
                listingsCount);
    }
}
