package zm.eoz.platform.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record StatusChangeRequest(@NotBlank String status) {}
