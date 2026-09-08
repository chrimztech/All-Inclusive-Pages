package zm.eoz.platform.recruitment.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.recruitment.PipelineNote;

public record NoteResponse(UUID id, String authorName, String classification, String note, Instant createdAt) {
    public static NoteResponse from(PipelineNote n) {
        return new NoteResponse(
                n.getId(),
                n.getAuthor() != null ? n.getAuthor().getFullName() : "Unknown",
                n.getClassification().name(),
                n.getNote(),
                n.getCreatedAt());
    }
}
