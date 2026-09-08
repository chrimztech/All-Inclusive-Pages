package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record AnswerSubmission(@NotEmpty List<Item> answers) {
    public record Item(@NotNull UUID questionId, String answer) {}
}
