package zm.eoz.platform.candidate.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.candidate.AlertSubscription;

public record AlertSubscriptionResponse(
        UUID id, String categoryName, String keyword, String region, String frequency, boolean active, Instant createdAt) {
    public static AlertSubscriptionResponse from(AlertSubscription a) {
        return new AlertSubscriptionResponse(
                a.getId(),
                a.getCategory() != null ? a.getCategory().getName() : null,
                a.getKeyword(),
                a.getRegion(),
                a.getFrequency().name(),
                a.isActive(),
                a.getCreatedAt());
    }
}
