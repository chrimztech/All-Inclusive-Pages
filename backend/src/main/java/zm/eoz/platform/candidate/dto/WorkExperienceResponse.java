package zm.eoz.platform.candidate.dto;

import java.time.LocalDate;
import java.util.UUID;
import zm.eoz.platform.candidate.CandidateWorkExperience;

public record WorkExperienceResponse(
        UUID id,
        String title,
        String employerName,
        LocalDate startDate,
        LocalDate endDate,
        boolean current,
        String description,
        int displayOrder) {
    public static WorkExperienceResponse from(CandidateWorkExperience e) {
        return new WorkExperienceResponse(
                e.getId(), e.getTitle(), e.getEmployerName(), e.getStartDate(), e.getEndDate(), e.isCurrent(),
                e.getDescription(), e.getDisplayOrder());
    }
}
