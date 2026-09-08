package zm.eoz.platform.settings.dto;

import jakarta.validation.constraints.NotBlank;

public record SettingUpdateRequest(@NotBlank String value) {}
