package zm.eoz.platform.opportunity.dto;

import java.time.Instant;

/** Every field is optional; null means "leave unchanged". */
public record OpportunityUpdateRequest(
        String title,
        String categoryCode,
        String description,
        String responsibilities,
        String requirements,
        String benefits,
        String location,
        String region,
        String workMode,
        Instant deadline,
        String applicationUrl,
        String applicationEmail,
        String applicationAddress,
        String source,
        /** Switches how candidates apply; the matching route field must then be present on the listing. */
        String applicationMode) {}
