package zm.eoz.platform.content.dto;

import jakarta.validation.constraints.NotBlank;

public record VariantUpsertRequest(@NotBlank String channel, @NotBlank String body) {}
