package zm.eoz.platform.opportunity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @Size(max = 64) String code,
        @NotBlank @Size(max = 128) String name,
        @Size(max = 255) String description) {}
