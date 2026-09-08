package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record BulkStageChangeRequest(@NotEmpty List<UUID> candidateIds, @NotBlank String stage) {}
