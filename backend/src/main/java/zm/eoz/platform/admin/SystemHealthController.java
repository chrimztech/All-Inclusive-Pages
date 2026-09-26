package zm.eoz.platform.admin;

import jakarta.persistence.EntityManager;
import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;

/**
 * Real, verifiable operational signals only — no fabricated latency/availability percentages.
 * If a metric isn't actually tracked (e.g. notification retry counts), it doesn't appear here.
 */
@RestController
@RequestMapping("/api/v1/admin/system")
@PreAuthorize("hasAuthority('SYSTEM_MANAGE')")
public class SystemHealthController {

    private final EntityManager entityManager;
    private final String uploadDir;

    public SystemHealthController(EntityManager entityManager, @Value("${eoz.storage.local-dir:./data/uploads}") String uploadDir) {
        this.entityManager = entityManager;
        this.uploadDir = uploadDir;
    }

    public record ServiceCheck(String name, boolean up, String detail) {}

    public record ScheduledJobInfo(String name, String interval) {}

    public record SystemHealthResponse(List<ServiceCheck> services, List<ScheduledJobInfo> scheduledJobs, long uptimeSeconds) {}

    @GetMapping("/health")
    public ApiResponse<SystemHealthResponse> health() {
        boolean dbUp = checkDatabase();
        boolean storageUp = checkStorage();

        List<ServiceCheck> services = List.of(
                new ServiceCheck("Application", true, "Responding"),
                new ServiceCheck("PostgreSQL database", dbUp, dbUp ? "Query succeeded" : "Query failed"),
                new ServiceCheck("Local file storage", storageUp, storageUp ? "Writable" : "Not writable"));

        List<ScheduledJobInfo> jobs = List.of(
                new ScheduledJobInfo("Close expired opportunities", "Every 5 minutes"),
                new ScheduledJobInfo("Publish scheduled opportunities", "Every 1 minute"),
                new ScheduledJobInfo("Publish scheduled content", "Every 1 minute"),
                new ScheduledJobInfo("Instant opportunity alerts", "Every 5 minutes"),
                new ScheduledJobInfo("Alert digests & deadline reminders", "Every hour"),
                new ScheduledJobInfo("Send queued emails (with retries)", "Every 30 seconds"),
                new ScheduledJobInfo("Generate CSV exports", "Every 20 seconds"),
                new ScheduledJobInfo("Retention clean-up & account erasure", "Every 24 hours"),
                new ScheduledJobInfo("Database backup (pg_dump)", "Every 24 hours"));

        long uptimeSeconds = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
        return ApiResponse.of(new SystemHealthResponse(services, jobs, uptimeSeconds));
    }

    private boolean checkDatabase() {
        try {
            entityManager.createNativeQuery("SELECT 1").getSingleResult();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkStorage() {
        try {
            Path dir = Path.of(uploadDir);
            Files.createDirectories(dir);
            Path probe = dir.resolve(".health-check");
            Files.writeString(probe, "ok");
            Files.deleteIfExists(probe);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
