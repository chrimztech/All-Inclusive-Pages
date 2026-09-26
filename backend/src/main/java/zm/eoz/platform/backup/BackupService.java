package zm.eoz.platform.backup;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.backup.dto.BackupResponse;
import zm.eoz.platform.backup.dto.RestoreResponse;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;

/**
 * Real, working pg_dump-based backups — not a placeholder. Requires pg_dump on PATH (bundled
 * with any PostgreSQL client install). Retains the most recent {@link #RETENTION_COUNT} backups
 * on disk and prunes older ones after each successful run.
 */
@Service
public class BackupService {

    private static final Logger log = LoggerFactory.getLogger(BackupService.class);
    private static final int RETENTION_COUNT = 14;
    private static final Pattern JDBC_URL_PATTERN =
            Pattern.compile("jdbc:postgresql://([^:/]+)(?::(\\d+))?/([^?]+)");

    private final SystemBackupRepository backupRepository;
    private final AuditService auditService;
    private final RestoreFlagService restoreFlagService;
    private final Path backupDir;
    private final String host;
    private final String port;
    private final String database;
    private final String dbUser;
    private final String dbPassword;

    public BackupService(
            SystemBackupRepository backupRepository,
            AuditService auditService,
            RestoreFlagService restoreFlagService,
            @Value("${eoz.backup.dir:./data/backups}") String backupDirPath,
            @Value("${spring.datasource.url}") String jdbcUrl,
            @Value("${spring.datasource.username}") String dbUser,
            @Value("${spring.datasource.password}") String dbPassword) {
        this.backupRepository = backupRepository;
        this.auditService = auditService;
        this.restoreFlagService = restoreFlagService;
        this.backupDir = Path.of(backupDirPath);
        this.dbUser = dbUser;
        this.dbPassword = dbPassword;

        Matcher matcher = JDBC_URL_PATTERN.matcher(jdbcUrl);
        if (!matcher.find()) {
            throw new IllegalStateException("Could not parse database host/port/name from spring.datasource.url: " + jdbcUrl);
        }
        this.host = matcher.group(1);
        this.port = matcher.group(2) != null ? matcher.group(2) : "5432";
        this.database = matcher.group(3);

        try {
            Files.createDirectories(this.backupDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create backup directory: " + this.backupDir, e);
        }
    }

    @Transactional
    public BackupResponse trigger(User actor) {
        // Never reuse a name: a second backup in the same second (a double click, or the pre-restore safety
        // backup) would otherwise overwrite the first file, silently replacing the backup being restored.
        String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").format(java.time.LocalDateTime.now());
        String fileName = "eoz-backup-" + timestamp + ".dump";
        for (int n = 2; Files.exists(backupDir.resolve(fileName)) || backupRepository.existsByFileName(fileName); n++) {
            fileName = "eoz-backup-" + timestamp + "-" + n + ".dump";
        }
        Path target = backupDir.resolve(fileName);

        SystemBackup backup = new SystemBackup();
        backup.setFileName(fileName);
        backup.setStatus(SystemBackup.Status.RUNNING);
        backup.setTriggeredBy(actor);
        backup = backupRepository.save(backup);

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "pg_dump",
                    "-h", host,
                    "-p", port,
                    "-U", dbUser,
                    "-F", "c",
                    "-f", target.toString(),
                    database);
            pb.environment().put("PGPASSWORD", dbPassword);
            pb.redirectErrorStream(false);
            Process process = pb.start();
            String stderr = new String(process.getErrorStream().readAllBytes());
            boolean finished = process.waitFor(5, java.util.concurrent.TimeUnit.MINUTES);

            if (!finished) {
                process.destroyForcibly();
                backup.setStatus(SystemBackup.Status.FAILED);
                backup.setErrorMessage("Backup timed out after 5 minutes.");
            } else if (process.exitValue() != 0) {
                backup.setStatus(SystemBackup.Status.FAILED);
                backup.setErrorMessage(stderr.isBlank() ? "pg_dump exited with code " + process.exitValue() : stderr);
            } else {
                backup.setStatus(SystemBackup.Status.SUCCESS);
                backup.setSizeBytes(Files.size(target));
            }
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            backup.setStatus(SystemBackup.Status.FAILED);
            backup.setErrorMessage("pg_dump could not be run: " + e.getMessage()
                    + ". Ensure pg_dump is installed and on PATH.");
            log.error("Backup failed to start", e);
        }
        backup.setCompletedAt(Instant.now());
        backup = backupRepository.save(backup);

        auditService.record(
                actor,
                backup.getStatus() == SystemBackup.Status.SUCCESS ? "BACKUP_SUCCEEDED" : "BACKUP_FAILED",
                "SystemBackup",
                backup.getId().toString(),
                backup.getStatus() == SystemBackup.Status.SUCCESS
                        ? "Created " + fileName
                        : "Failed: " + backup.getErrorMessage());

        if (backup.getStatus() == SystemBackup.Status.SUCCESS) {
            prune();
        }
        return BackupResponse.from(backup);
    }

    @Transactional(readOnly = true)
    public List<BackupResponse> list() {
        return backupRepository.findAllByOrderByStartedAtDesc().stream().map(BackupResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public SystemBackup get(java.util.UUID id) {
        return backupRepository.findById(id).orElseThrow(() -> new NotFoundException("Backup not found: " + id));
    }

    public Path resolve(SystemBackup backup) {
        return backupDir.resolve(backup.getFileName());
    }

    /**
     * Restores the database from a completed backup. Destructive and irreversible on its own, so it is
     * guarded: the admin must type the exact backup filename as confirmation, and a fresh safety backup of
     * the CURRENT state is taken immediately beforehand (and must itself succeed) so the restore can be undone
     * by restoring that safety backup if needed.
     */
    public RestoreResponse restore(java.util.UUID backupId, String confirmFileName, User actor) {
        SystemBackup backup = get(backupId);
        if (backup.getStatus() != SystemBackup.Status.SUCCESS) {
            throw new BadRequestException("This backup did not complete successfully and cannot be restored.");
        }
        if (confirmFileName == null || !backup.getFileName().equals(confirmFileName.trim())) {
            throw new BadRequestException("Filename confirmation does not match. Type the exact backup filename to confirm.");
        }
        Path source = resolve(backup);
        if (!Files.exists(source)) {
            throw new NotFoundException("Backup file is missing on disk: " + backup.getFileName());
        }

        BackupResponse safety = trigger(actor);
        if (!"SUCCESS".equals(safety.status())) {
            auditService.record(actor, "RESTORE_ABORTED", "SystemBackup", backup.getId().toString(),
                    "Restore aborted: pre-restore safety backup failed (" + safety.errorMessage() + ")");
            return new RestoreResponse(false, backup.getFileName(), safety.fileName(),
                    "Restore aborted: the safety backup taken immediately before restoring failed, so nothing was changed. "
                            + safety.errorMessage());
        }

        // Taken after the safety backup so that backup's own row survives the restore too.
        RestoreFlagService.Snapshot snapshot = restoreFlagService.capture();

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "pg_restore",
                    "-h", host,
                    "-p", port,
                    "-U", dbUser,
                    "-d", database,
                    "--clean",
                    "--if-exists",
                    "--no-owner",
                    source.toString());
            pb.environment().put("PGPASSWORD", dbPassword);
            Process process = pb.start();
            String stderr = new String(process.getErrorStream().readAllBytes());
            boolean finished = process.waitFor(10, java.util.concurrent.TimeUnit.MINUTES);

            if (!finished) {
                process.destroyForcibly();
                auditService.record(actor, "RESTORE_FAILED", "SystemBackup", backup.getId().toString(), "Restore timed out after 10 minutes.");
                return new RestoreResponse(false, backup.getFileName(), safety.fileName(),
                        "Restore timed out after 10 minutes. A safety backup (" + safety.fileName() + ") was taken beforehand.");
            }
            if (process.exitValue() != 0) {
                auditService.record(actor, "RESTORE_FAILED", "SystemBackup", backup.getId().toString(),
                        "pg_restore exited " + process.exitValue() + ": " + stderr);
                return new RestoreResponse(false, backup.getFileName(), safety.fileName(),
                        "pg_restore reported errors (exit " + process.exitValue()
                                + "). A safety backup (" + safety.fileName()
                                + ") was taken beforehand so the current data is recoverable. Details: "
                                + (stderr.isBlank() ? "none" : stderr));
            }
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            auditService.record(actor, "RESTORE_FAILED", "SystemBackup", backup.getId().toString(), "pg_restore could not run: " + e.getMessage());
            return new RestoreResponse(false, backup.getFileName(), safety.fileName(),
                    "pg_restore could not be run: " + e.getMessage() + ". Ensure pg_restore is installed and on PATH.");
        }

        int flagged = reconcileAfterRestore(snapshot, backup.getFileName(), actor);
        auditService.record(actor, "RESTORE_SUCCEEDED", "SystemBackup", backup.getId().toString(),
                "Restored database from " + backup.getFileName() + " (safety backup: " + safety.fileName() + ")");
        return new RestoreResponse(true, backup.getFileName(), safety.fileName(),
                "Database restored from " + backup.getFileName() + ". A safety backup of the prior state was saved as "
                        + safety.fileName() + "."
                        + (flagged > 0
                                ? " " + flagged + " permanently deleted item(s) came back and were flagged for review."
                                : ""),
                flagged);
    }

    /**
     * A failure here must not report the restore itself as failed: the data is already back. It is logged and
     * audited so the ledger can be checked by hand.
     */
    private int reconcileAfterRestore(RestoreFlagService.Snapshot snapshot, String restoredFrom, User actor) {
        try {
            return restoreFlagService.reconcile(snapshot, restoredFrom, actor);
        } catch (RuntimeException e) {
            log.error("Restore succeeded but deleted-item reconciliation failed", e);
            auditService.record(actor, "RESTORE_RECONCILE_FAILED", "SystemBackup", restoredFrom,
                    "Deleted-item flagging failed after restore: " + e.getMessage());
            return 0;
        }
    }

    /** Deletes files and rows for backups beyond the retention count, oldest first. */
    private void prune() {
        List<SystemBackup> successes = backupRepository.findAllByOrderByStartedAtDesc().stream()
                .filter(b -> b.getStatus() == SystemBackup.Status.SUCCESS)
                .toList();
        if (successes.size() <= RETENTION_COUNT) {
            return;
        }
        for (SystemBackup old : successes.subList(RETENTION_COUNT, successes.size())) {
            try {
                Files.deleteIfExists(resolve(old));
            } catch (IOException e) {
                log.warn("Could not delete pruned backup file {}", old.getFileName(), e);
            }
            backupRepository.delete(old);
        }
    }
}
