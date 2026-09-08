package zm.eoz.platform.content.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.content.ContentVariant;

public record ContentVariantResponse(UUID id, String channel, String body, Instant updatedAt) {
    public static ContentVariantResponse from(ContentVariant v) {
        return new ContentVariantResponse(v.getId(), v.getChannel().name(), v.getBody(), v.getUpdatedAt());
    }
}
