package zm.eoz.platform.servicecatalog.dto;

import jakarta.validation.constraints.NotBlank;

public record ServiceOrderMessageRequest(@NotBlank String message) {}
