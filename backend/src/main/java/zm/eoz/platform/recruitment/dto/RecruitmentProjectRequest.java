package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record RecruitmentProjectRequest(@NotBlank String title, UUID opportunityId, UUID organisationId, String confidentiality) {}
