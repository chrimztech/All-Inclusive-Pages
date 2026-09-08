package zm.eoz.platform.recruitment.dto;

import java.util.List;
import java.util.UUID;
import zm.eoz.platform.recruitment.PipelineCandidate;

public record TalentPoolCandidateResponse(
        UUID id, String candidateName, String candidateEmail, String stage, String projectTitle, List<String> tags) {
    public static TalentPoolCandidateResponse from(PipelineCandidate c, List<String> tags) {
        return new TalentPoolCandidateResponse(
                c.getId(), c.getCandidateName(), c.getCandidateEmail(), c.getStage().name(), c.getProject().getTitle(), tags);
    }
}
