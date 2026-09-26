package zm.eoz.platform.backup.dto;

/** {@code flaggedCount} is how many permanently deleted items came back with the restore and were flagged. */
public record RestoreResponse(
        boolean success, String restoredFromFileName, String safetyBackupFileName, String message, int flaggedCount) {

    public RestoreResponse(boolean success, String restoredFromFileName, String safetyBackupFileName, String message) {
        this(success, restoredFromFileName, safetyBackupFileName, message, 0);
    }
}
