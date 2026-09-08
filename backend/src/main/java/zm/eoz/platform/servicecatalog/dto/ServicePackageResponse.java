package zm.eoz.platform.servicecatalog.dto;

import java.math.BigDecimal;
import java.util.List;
import zm.eoz.platform.servicecatalog.ServicePackage;

public record ServicePackageResponse(
        String slug, String name, String description, BigDecimal price, String currency, String turnaround, List<String> includes) {
    public static ServicePackageResponse from(ServicePackage p) {
        List<String> includesList = p.getIncludes() == null || p.getIncludes().isBlank()
                ? List.of()
                : java.util.Arrays.stream(p.getIncludes().split(";")).map(String::trim).toList();
        return new ServicePackageResponse(
                p.getSlug(), p.getName(), p.getDescription(), p.getPrice(), p.getCurrency(), p.getTurnaround(), includesList);
    }
}
