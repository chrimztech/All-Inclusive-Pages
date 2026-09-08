package zm.eoz.platform.content.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import zm.eoz.platform.content.ContentItem;

public record ContentItemResponse(
        UUID id,
        String title,
        String series,
        String body,
        UUID opportunityId,
        String status,
        Instant scheduledAt,
        Instant publishedAt,
        String versionHash,
        List<ContentVariantResponse> variants) {
    public static ContentItemResponse from(ContentItem item, List<ContentVariantResponse> variants) {
        return new ContentItemResponse(
                item.getId(),
                item.getTitle(),
                item.getSeries() != null ? item.getSeries().name() : null,
                item.getBody(),
                item.getOpportunity() != null ? item.getOpportunity().getId() : null,
                item.getStatus().name(),
                item.getScheduledAt(),
                item.getPublishedAt(),
                item.getVersionHash(),
                variants);
    }
}
