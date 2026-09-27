package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;

/**
 * Interview feedback. {@code scores} is required (one per criterion) when the project has a scorecard;
 * {@code recommendation} is one of STRONG_NO, NO, YES, STRONG_YES.
 */
public record FeedbackRequest(
        @Min(1) @Max(5) int rating, String comments, List<CriterionScore> scores, String recommendation) {

    public record CriterionScore(UUID criterionId, int score) {}
}
