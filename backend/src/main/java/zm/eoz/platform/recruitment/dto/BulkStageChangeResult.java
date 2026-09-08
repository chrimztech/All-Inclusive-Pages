package zm.eoz.platform.recruitment.dto;

import java.util.List;
import java.util.UUID;

public record BulkStageChangeResult(int updated, List<UUID> candidateIds, String stage) {}
