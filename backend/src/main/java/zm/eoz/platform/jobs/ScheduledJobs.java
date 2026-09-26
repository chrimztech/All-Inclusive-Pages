package zm.eoz.platform.jobs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import zm.eoz.platform.backup.BackupService;
import zm.eoz.platform.candidate.AlertDispatchService;
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
    private final AlertDispatchService alertDispatchService;
    private final zm.eoz.platform.notification.EmailDeliveryService emailDeliveryService;
    private final zm.eoz.platform.export.ExportService exportService;
    private final zm.eoz.platform.privacy.RetentionService retentionService;

    public ScheduledJobs(
            OpportunityService opportunityService,
            ContentService contentService,
            BackupService backupService,
            AlertDispatchService alertDispatchService,
            zm.eoz.platform.notification.EmailDeliveryService emailDeliveryService,
            zm.eoz.platform.export.ExportService exportService,
            zm.eoz.platform.privacy.RetentionService retentionService) {
        this.alertDispatchService = alertDispatchService;
        this.emailDeliveryService = emailDeliveryService;
        this.exportService = exportService;
        this.retentionService = retentionService;
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

    /** Instant opportunity alerts for newly published matches. Runs every 5 minutes. */
    @Scheduled(fixedRate = 5 * 60 * 1000, initialDelay = 2 * 60 * 1000)
    public void sendInstantAlerts() {
        int sent = alertDispatchService.dispatchInstant();
        if (sent > 0) {
            log.info("Sent {} instant opportunity alert(s)", sent);
        }
    }

    /** Daily/weekly alert digests that are due, and closing-soon reminders for saved listings. Runs hourly. */
    @Scheduled(fixedRate = 60 * 60 * 1000, initialDelay = 3 * 60 * 1000)
    public void sendDigestsAndReminders() {
        int digests = alertDispatchService.dispatchDigests();
        int reminders = alertDispatchService.dispatchDeadlineReminders();
        if (digests + reminders > 0) {
            log.info("Sent {} alert digest(s) and {} deadline reminder(s)", digests, reminders);
        }
    }

    /** Sends queued emails; failures are retried with backoff by EmailDeliveryService. Every 30 seconds. */
    @Scheduled(fixedDelay = 30 * 1000, initialDelay = 20 * 1000)
    public void sendQueuedEmails() {
        int sent = emailDeliveryService.sendDue();
        if (sent > 0) {
            log.info("Sent {} queued email(s)", sent);
        }
    }

    /** Generates requested CSV exports. Every 20 seconds. */
    @Scheduled(fixedDelay = 20 * 1000, initialDelay = 15 * 1000)
    public void runExports() {
        int done = exportService.processQueue();
        if (done > 0) {
            log.info("Generated {} export(s)", done);
        }
    }

    /** Retention clean-up and due account erasures. Daily. */
    @Scheduled(fixedRate = 24 * 60 * 60 * 1000, initialDelay = 5 * 60 * 1000)
    public void enforceRetention() {
        retentionService.run();
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
