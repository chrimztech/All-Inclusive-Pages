package zm.eoz.platform.application.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.application.CandidateApplication;

public record ApplicationResponse(
        UUID id,
        String reference,
        UUID opportunityId,
        String opportunityTitle,
        String organisationName,
        UUID candidateId,
        String candidateName,
        String candidateEmail,
        UUID resumeFileId,
        String coverNote,
        String status,
        Instant submittedAt,
        Instant updatedAt) {

    public static ApplicationResponse from(CandidateApplication a) {
        return new ApplicationResponse(
                a.getId(),
                a.getReference(),
                a.getOpportunity().getId(),
                a.getOpportunity().getTitle(),
                a.getOpportunity().getOrganisationName(),
                a.getCandidate().getId(),
                a.getCandidate().getFullName(),
                a.getCandidate().getEmail(),
                a.getResumeFileId(),
                a.getCoverNote(),
                a.getStatus().name(),
                a.getSubmittedAt(),
                a.getUpdatedAt());
    }
}
