package zm.eoz.platform.content;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.content.dto.ContentItemRequest;
import zm.eoz.platform.content.dto.ContentItemResponse;
import zm.eoz.platform.content.dto.ContentVariantResponse;
import zm.eoz.platform.content.dto.VariantUpsertRequest;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.opportunity.Opportunity;
import zm.eoz.platform.opportunity.OpportunityRepository;

@Service
public class ContentService {

    private static final Map<ContentItem.Status, Set<ContentItem.Status>> ALLOWED_TRANSITIONS = Map.of(
            ContentItem.Status.DRAFT, Set.of(ContentItem.Status.PENDING_REVIEW),
            ContentItem.Status.PENDING_REVIEW, Set.of(ContentItem.Status.APPROVED, ContentItem.Status.DRAFT),
            ContentItem.Status.APPROVED, Set.of(ContentItem.Status.SCHEDULED, ContentItem.Status.PUBLISHED),
            ContentItem.Status.SCHEDULED, Set.of(ContentItem.Status.PUBLISHED));

    private static final String WHATSAPP_WORDING =
            "📲 Follow the Echo Opportunities Zambia channel on WhatsApp: https://whatsapp.com/channel/0029Vb6cAbO7z4kmbz8ii90I";

    private final ContentItemRepository itemRepository;
    private final ContentVariantRepository variantRepository;
    private final OpportunityRepository opportunityRepository;
    private final AuditService auditService;

    private final zm.eoz.platform.backup.DeletionLedger deletionLedger;

    public ContentService(
            ContentItemRepository itemRepository,
            ContentVariantRepository variantRepository,
            OpportunityRepository opportunityRepository,
            AuditService auditService,
            zm.eoz.platform.backup.DeletionLedger deletionLedger) {
        this.deletionLedger = deletionLedger;
        this.itemRepository = itemRepository;
        this.variantRepository = variantRepository;
        this.opportunityRepository = opportunityRepository;
        this.auditService = auditService;
    }

    @Transactional
    public ContentItemResponse create(ContentItemRequest request, User actor) {
        ContentItem item = new ContentItem();
        item.setTitle(request.title());
        item.setBody(request.body());
        if (request.series() != null) {
            try {
                item.setSeries(ContentItem.Series.valueOf(request.series()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown series: " + request.series());
            }
        }
        if (request.opportunityId() != null) {
            Opportunity opportunity = opportunityRepository
                    .findById(request.opportunityId())
                    .orElseThrow(() -> new NotFoundException("Opportunity not found: " + request.opportunityId()));
            item.setOpportunity(opportunity);
            item.setSeries(ContentItem.Series.OPPORTUNITY_POST);
        }
        item.setCreatedBy(actor);
        item.setVersionHash(versionHash(item.getTitle(), item.getBody()));
        item = itemRepository.save(item);
        auditService.record(actor, "CONTENT_CREATED", "ContentItem", item.getId().toString(), "Created \"" + item.getTitle() + "\"");
        return toResponse(item);
    }

    @Transactional(readOnly = true)
    public Page<ContentItemResponse> list(Pageable pageable) {
        return itemRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ContentItemResponse get(UUID id) {
        return toResponse(requireItem(id));
    }

    @Transactional
    public ContentItemResponse transition(UUID id, ContentItem.Status target, User actor) {
        ContentItem item = requireItem(id);
        Set<ContentItem.Status> allowed = ALLOWED_TRANSITIONS.getOrDefault(item.getStatus(), Set.of());
        if (!allowed.contains(target)) {
            throw new BadRequestException("Cannot move content from " + item.getStatus() + " to " + target + ".");
        }
        item.setStatus(target);
        if (target == ContentItem.Status.PUBLISHED) {
            item.setPublishedAt(Instant.now());
        }
        item.setUpdatedAt(Instant.now());
        auditService.record(actor, "CONTENT_" + target, "ContentItem", item.getId().toString(), "Moved to " + target);
        return toResponse(item);
    }

    @Transactional
    public ContentItemResponse schedule(UUID id, Instant scheduledAt, User actor) {
        ContentItem item = requireItem(id);
        if (item.getStatus() != ContentItem.Status.APPROVED) {
            throw new BadRequestException("Only approved content can be scheduled.");
        }
        item.setScheduledAt(scheduledAt);
        item.setStatus(ContentItem.Status.SCHEDULED);
        item.setUpdatedAt(Instant.now());
        auditService.record(actor, "CONTENT_SCHEDULED", "ContentItem", item.getId().toString(), "Scheduled for " + scheduledAt);
        return toResponse(item);
    }

    /** Publishes everything whose scheduled time has arrived. Called by the background job. */
    @Transactional
    public int publishDueScheduled() {
        List<ContentItem> due = itemRepository.findByStatusAndScheduledAtBefore(ContentItem.Status.SCHEDULED, Instant.now());
        for (ContentItem item : due) {
            item.setStatus(ContentItem.Status.PUBLISHED);
            item.setPublishedAt(Instant.now());
            item.setUpdatedAt(Instant.now());
        }
        return due.size();
    }

    @Transactional
    public ContentVariantResponse upsertVariant(UUID id, VariantUpsertRequest request, User actor) {
        ContentItem item = requireItem(id);
        ContentVariant.Channel channel;
        try {
            channel = ContentVariant.Channel.valueOf(request.channel());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown channel: " + request.channel());
        }
        ContentVariant variant = variantRepository
                .findByContentItemIdAndChannel(id, channel)
                .orElseGet(() -> {
                    ContentVariant v = new ContentVariant();
                    v.setContentItem(item);
                    v.setChannel(channel);
                    return v;
                });
        variant.setBody(request.body());
        variant.setUpdatedAt(Instant.now());
        auditService.record(actor, "CONTENT_VARIANT_SAVED", "ContentItem", item.getId().toString(), "Saved " + channel + " variant");
        return ContentVariantResponse.from(variantRepository.save(variant));
    }

    /**
     * Auto-generates a channel variant from the item's linked opportunity, applying the brand
     * rule: WhatsApp and LinkedIn may carry the employer's full application route; Facebook and
     * TikTok withhold the direct route and redirect to the EOZ WhatsApp channel instead.
     */
    @Transactional
    public ContentVariantResponse generateVariant(UUID id, String channelName, User actor) {
        ContentItem item = requireItem(id);
        if (item.getOpportunity() == null) {
            throw new BadRequestException("This content item has no linked opportunity to generate from.");
        }
        ContentVariant.Channel channel;
        try {
            channel = ContentVariant.Channel.valueOf(channelName);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown channel: " + channelName);
        }
        String body = renderVariant(item.getOpportunity(), channel);
        return upsertVariant(id, new VariantUpsertRequest(channel.name(), body), actor);
    }

    private String renderVariant(Opportunity o, ContentVariant.Channel channel) {
        String deadline = o.getDeadline() != null
                ? DateTimeFormatter.ofPattern("d MMM yyyy").withZone(ZoneId.of("Africa/Lusaka")).format(o.getDeadline())
                : "Not specified";
        String route = switch (o.getApplicationMode()) {
            case EXTERNAL_URL -> o.getApplicationUrl();
            case EMPLOYER_EMAIL -> o.getApplicationEmail();
            case PHYSICAL_ADDRESS -> o.getApplicationAddress();
            default -> "See listing for details";
        };

        StringBuilder sb = new StringBuilder();
        sb.append("✅ ").append(o.getTitle()).append('\n');
        sb.append("Employer: ").append(o.getOrganisationName()).append('\n');
        if (o.getLocation() != null) sb.append("Location: ").append(o.getLocation()).append('\n');
        sb.append("Deadline: ").append(deadline).append('\n');

        boolean withholdRoute = channel == ContentVariant.Channel.FACEBOOK || channel == ContentVariant.Channel.TIKTOK;
        if (withholdRoute) {
            sb.append("How to apply: See our WhatsApp channel for the full application details.\n\n");
        } else {
            sb.append("How to apply: ").append(route).append("\n\n");
        }
        sb.append(WHATSAPP_WORDING);
        return sb.toString();
    }

    private String versionHash(String title, String body) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((title + "|" + body).getBytes(StandardCharsets.UTF_8));
            return "EOZ-" + HexFormat.of().formatHex(hash, 0, 4).toUpperCase();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private ContentItemResponse toResponse(ContentItem item) {
        List<ContentVariantResponse> variants = variantRepository.findByContentItemIdOrderByChannel(item.getId()).stream()
                .map(ContentVariantResponse::from)
                .toList();
        return ContentItemResponse.from(item, variants);
    }

    @Transactional
    public void delete(UUID id, User actor) {
        ContentItem item = requireItem(id);
        if (item.getStatus() == ContentItem.Status.PUBLISHED) {
            throw new BadRequestException("Published content cannot be deleted.");
        }
        variantRepository.deleteAll(variantRepository.findByContentItemIdOrderByChannel(id));
        itemRepository.delete(item);
        deletionLedger.record("ContentItem", id, item.getTitle(), actor);
        auditService.record(actor, "CONTENT_DELETED", "ContentItem", id.toString(), "Deleted \"" + item.getTitle() + "\"");
    }

    private ContentItem requireItem(UUID id) {
        return itemRepository.findById(id).orElseThrow(() -> new NotFoundException("Content item not found: " + id));
    }
}
