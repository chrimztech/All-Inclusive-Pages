package zm.eoz.platform.backup.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.backup.SystemBackup;

public record BackupResponse(
        UUID id,
        String fileName,
        Long sizeBytes,
        String status,
        String errorMessage,
        String triggeredByName,
        Instant startedAt,
        Instant completedAt) {
    public static BackupResponse from(SystemBackup b) {
        return new BackupResponse(
                b.getId(),
                b.getFileName(),
                b.getSizeBytes(),
                b.getStatus().name(),
                b.getErrorMessage(),
                b.getTriggeredBy() != null ? b.getTriggeredBy().getFullName() : "Scheduled job",
                b.getStartedAt(),
                b.getCompletedAt());
    }
}
