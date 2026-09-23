package zm.eoz.platform.candidate.dto;

import java.time.LocalDate;
import java.util.UUID;
import zm.eoz.platform.candidate.CandidateEducation;

public record EducationResponse(
        UUID id,
        String institution,
        String qualification,
        String fieldOfStudy,
        LocalDate startDate,
        LocalDate endDate,
        int displayOrder) {
    public static EducationResponse from(CandidateEducation e) {
        return new EducationResponse(
                e.getId(), e.getInstitution(), e.getQualification(), e.getFieldOfStudy(), e.getStartDate(), e.getEndDate(),
                e.getDisplayOrder());
    }
}
