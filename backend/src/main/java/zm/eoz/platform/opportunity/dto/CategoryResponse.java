package zm.eoz.platform.opportunity.dto;

public record CategoryResponse(String code, String name, String description) {
    public static CategoryResponse from(zm.eoz.platform.opportunity.OpportunityCategory c) {
        return new CategoryResponse(c.getCode(), c.getName(), c.getDescription());
    }
}
