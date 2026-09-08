package zm.eoz.platform.recruitment.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.recruitment.Interview;

public record InterviewResponse(UUID id, UUID candidateId, Instant scheduledAt, String mode, String location, String notes) {
    public static InterviewResponse from(Interview i) {
        return new InterviewResponse(
                i.getId(), i.getCandidate().getId(), i.getScheduledAt(), i.getMode().name(), i.getLocation(), i.getNotes());
    }
}
