package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotBlank;

public record NoteRequest(@NotBlank String note, String classification) {}
