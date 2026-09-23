package zm.eoz.platform.candidate.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record WorkExperienceRequest(
        @NotBlank String title,
        @NotBlank String employerName,
        LocalDate startDate,
        LocalDate endDate,
        boolean current,
        String description,
        int displayOrder) {}
