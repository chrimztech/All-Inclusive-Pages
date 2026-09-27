package zm.eoz.platform.opportunity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ForbiddenException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.storage.FileAsset;
import zm.eoz.platform.storage.FileStorageService;

/**
 * Documents attached to a listing (e.g. the official advert or terms of reference). Files go through the normal
 * checked file store; {@code opportunity_attachments.file_url} holds {@code file:<asset id>}. Anyone can download
 * the attachments of a published listing; drafts' attachments are visible only to those who manage the listing.
 */
@Service
public class OpportunityAttachmentService {

    public static final int MAX_PER_LISTING = 5;
    static final String OWNER_TYPE = "OPPORTUNITY_ATTACHMENT";

    public record Attachment(UUID id, String fileName, String contentType, Long sizeBytes, Instant uploadedAt) {}

    private final JdbcTemplate jdbc;
    private final OpportunityRepository opportunityRepository;
    private final OpportunityService opportunityService;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    public OpportunityAttachmentService(
            JdbcTemplate jdbc,
            OpportunityRepository opportunityRepository,
            OpportunityService opportunityService,
            FileStorageService fileStorageService,
            AuditService auditService) {
        this.jdbc = jdbc;
        this.opportunityRepository = opportunityRepository;
        this.opportunityService = opportunityService;
        this.fileStorageService = fileStorageService;
        this.auditService = auditService;
    }

    /** Attachments a requester may see: all for managers, only a published listing's for everyone else. */
    @Transactional(readOnly = true)
    public List<Attachment> list(UUID opportunityId, User requester) {
        requireVisible(require(opportunityId), requester);
        return jdbc.query(
                "select id, file_name, content_type, size_bytes, uploaded_at from opportunity_attachments"
                        + " where opportunity_id = ? order by uploaded_at",
                (rs, i) -> new Attachment(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3),
                        (Long) rs.getObject(4), rs.getTimestamp(5).toInstant()),
                opportunityId);
    }

    @Transactional
    public Attachment add(UUID opportunityId, MultipartFile file, User actor) {
        Opportunity opportunity = require(opportunityId);
        requireManager(opportunity, actor);
        Long count = jdbc.queryForObject("select count(*) from opportunity_attachments where opportunity_id = ?",
                Long.class, opportunityId);
        if (count != null && count >= MAX_PER_LISTING) {
            throw new BadRequestException("A listing can have at most " + MAX_PER_LISTING + " attachments. Remove one first.");
        }
        FileAsset asset = fileStorageService.store(file, OWNER_TYPE, opportunityId.toString(), actor);
        UUID id = jdbc.queryForObject(
                "insert into opportunity_attachments (opportunity_id, file_name, file_url, content_type, size_bytes)"
                        + " values (?, ?, ?, ?, ?) returning id",
                UUID.class, opportunityId, asset.getFileName(), "file:" + asset.getId(), asset.getContentType(),
                asset.getSizeBytes());
        auditService.record(actor, "ATTACHMENT_ADDED", "Opportunity", opportunity.getReference(), asset.getFileName());
        return new Attachment(id, asset.getFileName(), asset.getContentType(), asset.getSizeBytes(), Instant.now());
    }

    @Transactional
    public void remove(UUID opportunityId, UUID attachmentId, User actor) {
        Opportunity opportunity = require(opportunityId);
        requireManager(opportunity, actor);
        String fileUrl = fileUrl(opportunityId, attachmentId);
        jdbc.update("delete from opportunity_attachments where id = ?", attachmentId);
        FileAsset asset = fileStorageService.get(assetId(fileUrl));
        String name = asset.getFileName();
        jdbc.update("delete from file_assets where id = ?", asset.getId());
        fileStorageService.deleteStoredFile(asset.getStorageKey());
        auditService.record(actor, "ATTACHMENT_REMOVED", "Opportunity", opportunity.getReference(), name);
    }

    /** The stored file for a download, after the same visibility check as {@link #list}. */
    @Transactional(readOnly = true)
    public FileAsset forDownload(UUID attachmentId, User requester) {
        List<UUID> owner = jdbc.queryForList("select opportunity_id from opportunity_attachments where id = ?",
                UUID.class, attachmentId);
        if (owner.isEmpty()) throw new NotFoundException("Attachment not found.");
        requireVisible(require(owner.get(0)), requester);
        return fileStorageService.get(assetId(fileUrl(owner.get(0), attachmentId)));
    }

    private String fileUrl(UUID opportunityId, UUID attachmentId) {
        return jdbc.queryForList("select file_url from opportunity_attachments where id = ? and opportunity_id = ?",
                        String.class, attachmentId, opportunityId)
                .stream().findFirst().orElseThrow(() -> new NotFoundException("Attachment not found."));
    }

    private static UUID assetId(String fileUrl) {
        return UUID.fromString(fileUrl.substring("file:".length()));
    }

    private Opportunity require(UUID id) {
        return opportunityRepository.findById(id).orElseThrow(() -> new NotFoundException("Opportunity not found: " + id));
    }

    private void requireManager(Opportunity opportunity, User actor) {
        if (actor == null || !opportunityService.canManage(opportunity, actor)) {
            throw new ForbiddenException("You do not have access to this listing.");
        }
    }

    private void requireVisible(Opportunity opportunity, User requester) {
        if (opportunity.getStatus() == OpportunityStatus.PUBLISHED) return;
        // Hide unpublished listings' documents from outsiders without revealing that the listing exists.
        if (requester == null || !opportunityService.canManage(opportunity, requester)) {
            throw new NotFoundException("Opportunity not found: " + opportunity.getId());
        }
    }
}
