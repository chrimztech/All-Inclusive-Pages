package zm.eoz.platform.recruitment.dto;

import jakarta.validation.constraints.NotBlank;

public record PipelineCandidateRequest(@NotBlank String candidateName, String candidateEmail, String source) {}
