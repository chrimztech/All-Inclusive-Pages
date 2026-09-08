package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record FeedbackRequest(@Min(1) @Max(5) int rating, String comments) {}
