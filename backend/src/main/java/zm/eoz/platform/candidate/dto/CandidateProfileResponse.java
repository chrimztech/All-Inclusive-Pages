package zm.eoz.platform.candidate.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import zm.eoz.platform.candidate.CandidateProfile;

public record CandidateProfileResponse(
        String headline,
        String bio,
        String location,
        String educationSummary,
        String experienceSummary,
        String skills,
        UUID photoFileId,
        UUID resumeFileId,
        String availability,
        BigDecimal salaryExpectationMin,
        BigDecimal salaryExpectationMax,
        String salaryCurrency,
        String linkedinUrl,
        String portfolioUrl,
        List<WorkExperienceResponse> workExperience,
        List<EducationResponse> education,
        int completenessPercent) {

    public static CandidateProfileResponse from(
            CandidateProfile p, List<WorkExperienceResponse> workExperience, List<EducationResponse> education) {
        return new CandidateProfileResponse(
                p.getHeadline(),
                p.getBio(),
                p.getLocation(),
                p.getEducationSummary(),
                p.getExperienceSummary(),
                p.getSkills(),
                p.getPhotoFileId(),
                p.getResumeFileId(),
                p.getAvailability() != null ? p.getAvailability().name() : null,
                p.getSalaryExpectationMin(),
                p.getSalaryExpectationMax(),
                p.getSalaryCurrency(),
                p.getLinkedinUrl(),
                p.getPortfolioUrl(),
                workExperience,
                education,
                completeness(p, workExperience, education));
    }

    private static int completeness(CandidateProfile p, List<WorkExperienceResponse> workExperience, List<EducationResponse> education) {
        Object[] fields = {
            p.getHeadline(), p.getBio(), p.getLocation(), p.getSkills(), p.getPhotoFileId(), p.getResumeFileId(),
            p.getAvailability(), workExperience.isEmpty() ? null : workExperience, education.isEmpty() ? null : education
        };
        long filled = java.util.Arrays.stream(fields)
                .filter(f -> f != null && !(f instanceof String s && s.isBlank()))
                .count();
        return (int) Math.round((filled * 100.0) / fields.length);
    }
}
