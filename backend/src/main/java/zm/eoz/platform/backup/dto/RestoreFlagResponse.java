package zm.eoz.platform.backup.dto;

import java.time.Instant;
import java.util.UUID;

public record RestoreFlagResponse(
        UUID id,
        String entityType,
        UUID entityId,
        String label,
        String deletedByName,
        Instant deletedAt,
        String restoredFrom,
        Instant flaggedAt,
        String quarantinedFrom,
        String resolution,
        String resolvedByName,
        Instant resolvedAt) {}
