package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record InterviewRequest(@NotNull Instant scheduledAt, String mode, String location, String notes) {}
