package zm.eoz.platform.recruitment.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import zm.eoz.platform.recruitment.InterviewFeedback;
import zm.eoz.platform.recruitment.ScorecardService;

public record FeedbackResponse(
        UUID id,
        String authorName,
        int rating,
        String comments,
        Instant createdAt,
        String recommendation,
        List<ScorecardService.Score> scores,
        Double weightedScore) {

    public static FeedbackResponse from(InterviewFeedback f, List<ScorecardService.Score> scores) {
        List<ScorecardService.Score> s = scores == null ? List.of() : scores;
        return new FeedbackResponse(
                f.getId(),
                f.getAuthor() != null ? f.getAuthor().getFullName() : "Unknown",
                f.getRating(),
                f.getComments(),
                f.getCreatedAt(),
                f.getRecommendation(),
                s,
                ScorecardService.weighted(s));
    }
}
