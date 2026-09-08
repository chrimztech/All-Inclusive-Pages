package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotBlank;

public record ScreeningQuestionRequest(@NotBlank String question, String questionType, String knockoutAnswer) {}
