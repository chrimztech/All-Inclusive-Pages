package zm.eoz.platform.candidate.dto;

import zm.eoz.platform.candidate.CandidateProfile;

public record CandidateProfileResponse(
        String headline,
        String bio,
        String location,
        String educationSummary,
        String experienceSummary,
        String skills,
        int completenessPercent) {
    public static CandidateProfileResponse from(CandidateProfile p) {
        return new CandidateProfileResponse(
                p.getHeadline(), p.getBio(), p.getLocation(), p.getEducationSummary(), p.getExperienceSummary(), p.getSkills(),
                completeness(p));
    }

    private static int completeness(CandidateProfile p) {
        String[] fields = {p.getHeadline(), p.getBio(), p.getLocation(), p.getEducationSummary(), p.getExperienceSummary(), p.getSkills()};
        long filled = java.util.Arrays.stream(fields).filter(f -> f != null && !f.isBlank()).count();
        return (int) Math.round((filled * 100.0) / fields.length);
    }
}
