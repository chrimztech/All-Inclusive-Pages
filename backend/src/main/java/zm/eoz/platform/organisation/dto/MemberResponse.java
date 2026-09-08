package zm.eoz.platform.organisation.dto;

import java.util.UUID;
import zm.eoz.platform.organisation.OrganisationMember;

public record MemberResponse(UUID userId, String fullName, String email, String roleInOrg, String status) {
    public static MemberResponse from(OrganisationMember m) {
        return new MemberResponse(
                m.getUser().getId(), m.getUser().getFullName(), m.getUser().getEmail(), m.getRoleInOrg().name(), m.getStatus().name());
    }
}
