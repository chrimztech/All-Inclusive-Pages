package zm.eoz.platform.opportunity.dto;

import java.util.UUID;

public record AdminCategoryResponse(UUID id, String code, String name, String description, long listingCount) {}
