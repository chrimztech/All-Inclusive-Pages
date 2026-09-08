package zm.eoz.platform.recruitment.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.recruitment.InterviewFeedback;

public record FeedbackResponse(UUID id, String authorName, int rating, String comments, Instant createdAt) {
    public static FeedbackResponse from(InterviewFeedback f) {
        return new FeedbackResponse(
                f.getId(), f.getAuthor() != null ? f.getAuthor().getFullName() : "Unknown", f.getRating(), f.getComments(), f.getCreatedAt());
    }
}
