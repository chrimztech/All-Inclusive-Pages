package zm.eoz.platform.servicecatalog.dto;

import jakarta.validation.constraints.NotBlank;

public record ServiceOrderCreateRequest(@NotBlank String slug, String requirements) {}
