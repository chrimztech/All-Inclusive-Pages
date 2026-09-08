package zm.eoz.platform.recruitment.dto;

import java.util.UUID;
import zm.eoz.platform.recruitment.ScreeningQuestion;

public record ScreeningQuestionResponse(UUID id, String question, String questionType, String knockoutAnswer) {
    public static ScreeningQuestionResponse from(ScreeningQuestion q) {
        return new ScreeningQuestionResponse(q.getId(), q.getQuestion(), q.getQuestionType().name(), q.getKnockoutAnswer());
    }
}
