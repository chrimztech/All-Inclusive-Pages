package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ScorecardCriterionRequest(
        @NotBlank @Size(max = 120) String name, @Size(max = 500) String guidance, Integer weight) {}
