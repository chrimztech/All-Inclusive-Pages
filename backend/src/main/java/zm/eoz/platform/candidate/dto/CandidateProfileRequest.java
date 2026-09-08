package zm.eoz.platform.candidate.dto;

public record CandidateProfileRequest(
        String headline, String bio, String location, String educationSummary, String experienceSummary, String skills) {}
