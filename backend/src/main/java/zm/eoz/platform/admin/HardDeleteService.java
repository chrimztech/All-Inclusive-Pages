package zm.eoz.platform.admin;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.backup.DeletionLedger;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.storage.FileStorageService;

/**
 * Permanent (irreversible) deletion of users, organisations and opportunities, including everything that
 * only makes sense alongside them. Authorship columns on records that must survive (audit trail, payments,
 * content, ...) are set to NULL rather than deleted. Each method requires the caller to echo an exact
 * identifier of the target as confirmation, on top of the UI's own confirmation step.
 */
@Service
public class HardDeleteService {

    private static final List<String> USER_AUTHORSHIP_COLUMNS = List.of(
            "application_status_history.changed_by",
            "audit_events.actor_id",
            "contact_messages.resolved_by",
            "content_items.created_by",
            "fraud_reports.resolved_by",
            "interview_feedback.author_id",
            "interviews.created_by",
            "opportunities.created_by",
            "organisation_verification_reviews.reviewer_id",
            "organisations.created_by",
            "payments.recorded_by",
            "pipeline_notes.author_id",
            "recruitment_projects.created_by",
            "service_deliverables.uploaded_by",
            "service_orders.assigned_officer_id",
            "system_backups.triggered_by");

    private final JdbcTemplate jdbc;
    private final AuditService auditService;
    private final FileStorageService fileStorageService;
    private final DeletionLedger deletionLedger;

    public HardDeleteService(
            JdbcTemplate jdbc,
            AuditService auditService,
            FileStorageService fileStorageService,
            DeletionLedger deletionLedger) {
        this.jdbc = jdbc;
        this.auditService = auditService;
        this.fileStorageService = fileStorageService;
        this.deletionLedger = deletionLedger;
    }

    @Transactional
    public void deleteUser(UUID id, String confirm, boolean includePaymentRecords, User actor) {
        Map<String, Object> user = single("select email, full_name from users where id = ?", id, "User not found: " + id);
        String email = (String) user.get("email");
        requireConfirmation(confirm, email);
        if (id.equals(actor.getId())) {
            throw new BadRequestException("You cannot permanently delete your own account.");
        }
        Long otherAdmins = jdbc.queryForObject(
                "select count(*) from user_roles ur join roles r on r.id = ur.role_id where r.name = 'ADMIN' and ur.user_id <> ?",
                Long.class,
                id);
        Long targetIsAdmin = jdbc.queryForObject(
                "select count(*) from user_roles ur join roles r on r.id = ur.role_id where r.name = 'ADMIN' and ur.user_id = ?",
                Long.class,
                id);
        if (targetIsAdmin != null && targetIsAdmin > 0 && (otherAdmins == null || otherAdmins == 0)) {
            throw new BadRequestException("This is the only administrator account and cannot be deleted.");
        }
        Long payments = jdbc.queryForObject(
                "select count(*) from payments p join invoices i on i.id = p.invoice_id join service_orders o on o.id = i.order_id where o.customer_id = ?",
                Long.class,
                id);
        if (payments != null && payments > 0 && !includePaymentRecords) {
            throw new BadRequestException(
                    "This user has payment records, which must be kept for finance. Deactivate the account instead, or "
                            + "repeat the request with includePaymentRecords=true to erase those records too.");
        }

        jdbc.update("delete from applications where candidate_id = ?", id);
        jdbc.update("delete from service_orders where customer_id = ?", id);
        jdbc.update("delete from pipeline_candidates where candidate_user_id = ?", id);
        jdbc.update("delete from service_order_messages where sender_id = ?", id);
        for (String target : USER_AUTHORSHIP_COLUMNS) {
            String[] parts = target.split("\\.");
            jdbc.update("update " + parts[0] + " set " + parts[1] + " = null where " + parts[1] + " = ?", id);
        }

        jdbc.update("delete from candidate_profiles where user_id = ?", id);
        String ownFiles = "(select id from file_assets where uploaded_by = ?)";
        jdbc.update("update organisations set logo_file_id = null where logo_file_id in " + ownFiles, id);
        jdbc.update("update applications set resume_file_id = null where resume_file_id in " + ownFiles, id);
        jdbc.update("delete from service_deliverables where file_asset_id in " + ownFiles, id);
        List<String> storageKeys =
                jdbc.queryForList("select storage_key from file_assets where uploaded_by = ?", String.class, id);
        jdbc.update("delete from file_assets where uploaded_by = ?", id);

        jdbc.update("delete from users where id = ?", id);
        deletionLedger.record(
                "User",
                id,
                user.get("full_name") + " <" + email + ">",
                email,
                includePaymentRecords && payments != null && payments > 0,
                actor);
        removeFilesAfterCommit(storageKeys);
        auditService.record(actor, "USER_DELETED_PERMANENTLY", "User", id.toString(), "Permanently deleted " + email
                        + (payments != null && payments > 0 ? " including " + payments + " payment record(s)" : ""));
    }

    @Transactional
    public void deleteOrganisation(UUID id, String confirm, User actor) {
        Map<String, Object> org = single(
                "select legal_name, logo_file_id from organisations where id = ?", id, "Organisation not found: " + id);
        String name = (String) org.get("legal_name");
        requireConfirmation(confirm, name);

        List<Map<String, Object>> listings =
                jdbc.queryForList("select id, reference, title from opportunities where organisation_id = ?", id);
        for (Map<String, Object> listing : listings) {
            UUID opportunityId = (UUID) listing.get("id");
            removeOpportunityRows(opportunityId);
            recordOpportunity(opportunityId, listing, actor);
        }
        jdbc.update("update recruitment_projects set organisation_id = null where organisation_id = ?", id);
        Object logo = org.get("logo_file_id");
        List<String> storageKeys = List.of();
        jdbc.update("delete from organisations where id = ?", id);
        deletionLedger.record("Organisation", id, name, name, false, actor);
        if (logo != null) {
            storageKeys = jdbc.queryForList("select storage_key from file_assets where id = ?", String.class, logo);
            jdbc.update("delete from file_assets where id = ?", logo);
        }
        removeFilesAfterCommit(storageKeys);
        auditService.record(
                actor,
                "ORGANISATION_DELETED_PERMANENTLY",
                "Organisation",
                id.toString(),
                "Permanently deleted \"" + name + "\" and its " + listings.size() + " listing(s)");
    }

    @Transactional
    public void deleteOpportunity(UUID id, String confirm, User actor) {
        Map<String, Object> opp =
                single("select reference, title from opportunities where id = ?", id, "Opportunity not found: " + id);
        requireConfirmation(confirm, (String) opp.get("reference"));
        removeOpportunityRows(id);
        recordOpportunity(id, opp, actor);
        auditService.record(
                actor,
                "OPPORTUNITY_DELETED_PERMANENTLY",
                "Opportunity",
                (String) opp.get("reference"),
                "Permanently deleted \"" + opp.get("title") + "\"");
    }

    private void removeOpportunityRows(UUID opportunityId) {
        jdbc.update("delete from applications where opportunity_id = ?", opportunityId);
        jdbc.update("delete from fraud_reports where opportunity_id = ?", opportunityId);
        jdbc.update("update content_items set opportunity_id = null where opportunity_id = ?", opportunityId);
        jdbc.update("update recruitment_projects set opportunity_id = null where opportunity_id = ?", opportunityId);
        jdbc.update("update opportunities set flagged_duplicate_of = null where flagged_duplicate_of = ?", opportunityId);
        jdbc.update("delete from opportunities where id = ?", opportunityId);
    }

    private void recordOpportunity(UUID id, Map<String, Object> row, User actor) {
        String reference = (String) row.get("reference");
        deletionLedger.record("Opportunity", id, reference + " — " + row.get("title"), reference, false, actor);
    }

    private Map<String, Object> single(String sql, UUID id, String notFoundMessage) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, id);
        if (rows.isEmpty()) {
            throw new NotFoundException(notFoundMessage);
        }
        return rows.get(0);
    }

    private void requireConfirmation(String supplied, String expected) {
        if (supplied == null || !supplied.trim().equalsIgnoreCase(expected)) {
            throw new BadRequestException("Confirmation does not match. Type \"" + expected + "\" exactly to confirm.");
        }
    }

    private void removeFilesAfterCommit(List<String> storageKeys) {
        if (storageKeys.isEmpty()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                storageKeys.forEach(fileStorageService::deleteStoredFile);
            }
        });
    }
}
