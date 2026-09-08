package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotBlank;

public record TagRequest(@NotBlank String tag) {}
