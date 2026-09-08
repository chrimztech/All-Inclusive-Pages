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
    private final Path backupDir;
    private final String host;
    private final String port;
    private final String database;
    private final String dbUser;
    private final String dbPassword;

    public BackupService(
            SystemBackupRepository backupRepository,
            AuditService auditService,
            @Value("${eoz.backup.dir:./data/backups}") String backupDirPath,
            @Value("${spring.datasource.url}") String jdbcUrl,
            @Value("${spring.datasource.username}") String dbUser,
            @Value("${spring.datasource.password}") String dbPassword) {
        this.backupRepository = backupRepository;
        this.auditService = auditService;
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
        String timestamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").format(java.time.LocalDateTime.now());
        String fileName = "eoz-backup-" + timestamp + ".dump";
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
