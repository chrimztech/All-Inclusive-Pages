package zm.eoz.platform.candidate.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record EducationRequest(
        @NotBlank String institution,
        @NotBlank String qualification,
        String fieldOfStudy,
        LocalDate startDate,
        LocalDate endDate,
        int displayOrder) {}
