package zm.eoz.platform.recruitment.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.recruitment.RecruitmentProject;

public record RecruitmentProjectResponse(
        UUID id,
        String reference,
        String title,
        String opportunityTitle,
        String organisationName,
        String status,
        String confidentiality,
        Instant createdAt) {
    public static RecruitmentProjectResponse from(RecruitmentProject p) {
        return new RecruitmentProjectResponse(
                p.getId(),
                p.getReference(),
                p.getTitle(),
                p.getOpportunity() != null ? p.getOpportunity().getTitle() : null,
                p.getOrganisation() != null ? p.getOrganisation().getLegalName() : null,
                p.getStatus().name(),
                p.getConfidentiality().name(),
                p.getCreatedAt());
    }
}
