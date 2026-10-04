package zm.eoz.platform.information.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record InformationArticleRequest(
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 360) String excerpt,
        @NotBlank @Size(min = 80, max = 20_000) String body,
        @NotBlank String category,
        Boolean featured,
        @Size(max = 160) String sourceName,
        @Size(max = 1000)
                @Pattern(regexp = "^$|https?://.+", message = "must be a complete http or https URL")
                String sourceUrl) {}
