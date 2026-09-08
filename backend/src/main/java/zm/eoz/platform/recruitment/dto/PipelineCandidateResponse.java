package zm.eoz.platform.recruitment.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.recruitment.PipelineCandidate;

public record PipelineCandidateResponse(
        UUID id, UUID projectId, String candidateName, String candidateEmail, String stage, String source, Instant addedAt) {
    public static PipelineCandidateResponse from(PipelineCandidate c) {
        return new PipelineCandidateResponse(
                c.getId(), c.getProject().getId(), c.getCandidateName(), c.getCandidateEmail(), c.getStage().name(), c.getSource(), c.getAddedAt());
    }
}
