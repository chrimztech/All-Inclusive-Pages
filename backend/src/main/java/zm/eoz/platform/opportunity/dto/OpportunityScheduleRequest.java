package zm.eoz.platform.opportunity.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record OpportunityScheduleRequest(@NotNull Instant scheduledAt) {}
