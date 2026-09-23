package zm.eoz.platform.candidate.dto;

import java.math.BigDecimal;

public record CandidateProfileRequest(
        String headline,
        String bio,
        String location,
        String educationSummary,
        String experienceSummary,
        String skills,
        String availability,
        BigDecimal salaryExpectationMin,
        BigDecimal salaryExpectationMax,
        String salaryCurrency,
        String linkedinUrl,
        String portfolioUrl) {}
