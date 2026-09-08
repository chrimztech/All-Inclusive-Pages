package zm.eoz.platform.content.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record ContentItemRequest(@NotBlank String title, String series, @NotBlank String body, UUID opportunityId) {}
