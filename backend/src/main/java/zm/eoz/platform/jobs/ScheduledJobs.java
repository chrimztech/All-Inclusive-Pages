package zm.eoz.platform.jobs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import zm.eoz.platform.backup.BackupService;
import zm.eoz.platform.content.ContentService;
import zm.eoz.platform.opportunity.OpportunityService;

/**
 * Background jobs are idempotent (each run only acts on rows still in the matching state) and
 * safe to run concurrently across multiple instances — a row picked up by one run is no longer
 * eligible once its status changes, so a second instance running the same tick finds nothing left.
 */
@Component
public class ScheduledJobs {

    private static final Logger log = LoggerFactory.getLogger(ScheduledJobs.class);

    private final OpportunityService opportunityService;
    private final ContentService contentService;
    private final BackupService backupService;

    public ScheduledJobs(OpportunityService opportunityService, ContentService contentService, BackupService backupService) {
        this.opportunityService = opportunityService;
        this.contentService = contentService;
        this.backupService = backupService;
    }

    /** Closes published opportunities whose deadline has passed. Runs every 5 minutes. */
    @Scheduled(fixedRate = 5 * 60 * 1000)
    public void closeExpiredOpportunities() {
        int closed = opportunityService.closeExpired();
        if (closed > 0) {
            log.info("Closed {} expired opportunity(ies)", closed);
        }
    }

    /** Publishes opportunities scheduled for a time that has now arrived. Runs every minute. */
    @Scheduled(fixedRate = 60 * 1000)
    public void publishScheduledOpportunities() {
        int published = opportunityService.publishDueScheduled();
        if (published > 0) {
            log.info("Auto-published {} scheduled opportunity(ies)", published);
        }
    }

    /** Publishes content calendar items scheduled for a time that has now arrived. Runs every minute. */
    @Scheduled(fixedRate = 60 * 1000)
    public void publishScheduledContent() {
        int published = contentService.publishDueScheduled();
        if (published > 0) {
            log.info("Auto-published {} scheduled content item(s)", published);
        }
    }

    /** Full database backup via pg_dump. Runs once every 24 hours; retention is enforced by BackupService. */
    @Scheduled(fixedRate = 24 * 60 * 60 * 1000, initialDelay = 60 * 1000)
    public void runScheduledBackup() {
        var result = backupService.trigger(null);
        if ("SUCCESS".equals(result.status())) {
            log.info("Scheduled backup completed: {} ({} bytes)", result.fileName(), result.sizeBytes());
        } else {
            log.error("Scheduled backup failed: {}", result.errorMessage());
        }
    }
}
