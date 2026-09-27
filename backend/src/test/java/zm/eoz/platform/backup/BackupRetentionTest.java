package zm.eoz.platform.backup;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** Old backups beyond the configured count are deleted, newest first kept, and a lone good backup is never lost. */
@SpringBootTest(properties = {"eoz.backup.dir=target/it-backups", "eoz.backup.keep=2"})
@ActiveProfiles("test")
class BackupRetentionTest {

    @Autowired private BackupService backupService;
    @Autowired private SystemBackupRepository repository;

    @Test
    void keepsOnlyTheNewestSuccessfulBackups() throws Exception {
        Path dir = Path.of("target/it-backups");
        Files.createDirectories(dir);
        // Remove anything an interrupted earlier run left behind.
        repository.findAll().stream().filter(b -> b.getFileName().startsWith("it-retention-")).forEach(repository::delete);
        // Far-future start times make these the newest rows regardless of what else the test database holds.
        Instant base = Instant.now().plus(3650, ChronoUnit.DAYS);
        List<SystemBackup> made = new ArrayList<>();
        String[][] rows = {{"SUCCESS", "0"}, {"FAILED", "1"}, {"SUCCESS", "2"}, {"SUCCESS", "3"}, {"SUCCESS", "4"}};
        for (String[] r : rows) {
            String name = "it-retention-" + System.nanoTime() + ".dump";
            Files.writeString(dir.resolve(name), "backup");
            SystemBackup b = new SystemBackup();
            b.setFileName(name);
            b.setStatus(SystemBackup.Status.valueOf(r[0]));
            b.setStartedAt(base.plus(Long.parseLong(r[1]), ChronoUnit.HOURS));
            made.add(repository.save(b));
        }

        backupService.prune();

        List<SystemBackup> good = repository.findAllByOrderByStartedAtDesc().stream()
                .filter(b -> b.getStatus() == SystemBackup.Status.SUCCESS).toList();
        assertThat(good).hasSize(2);
        assertThat(good).extracting(SystemBackup::getFileName)
                .containsExactly(made.get(4).getFileName(), made.get(3).getFileName());
        assertThat(Files.exists(dir.resolve(made.get(4).getFileName()))).isTrue();
        assertThat(Files.exists(dir.resolve(made.get(2).getFileName()))).isFalse();
        assertThat(Files.exists(dir.resolve(made.get(0).getFileName()))).isFalse();
        // The failed attempt older than the kept backups is gone as well.
        assertThat(repository.findById(made.get(1).getId())).isEmpty();

        // Running it again changes nothing.
        assertThat(backupService.prune()).isZero();

        // Don't leave far-future rows that would sort ahead of other tests' backups.
        for (SystemBackup b : made) {
            repository.findById(b.getId()).ifPresent(repository::delete);
            Files.deleteIfExists(dir.resolve(b.getFileName()));
        }
    }
}
