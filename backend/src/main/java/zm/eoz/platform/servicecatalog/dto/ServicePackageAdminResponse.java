package zm.eoz.platform.servicecatalog.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import zm.eoz.platform.servicecatalog.ServicePackage;

/** Admin-facing view of a service package — includes id and active state, unlike the public catalogue response. */
public record ServicePackageAdminResponse(
        UUID id,
        String slug,
        String name,
        String description,
        BigDecimal price,
        String currency,
        String turnaround,
        List<String> includes,
        boolean active) {
    public static ServicePackageAdminResponse from(ServicePackage p) {
        List<String> includesList = p.getIncludes() == null || p.getIncludes().isBlank()
                ? List.of()
                : java.util.Arrays.stream(p.getIncludes().split(";")).map(String::trim).toList();
        return new ServicePackageAdminResponse(
                p.getId(), p.getSlug(), p.getName(), p.getDescription(), p.getPrice(), p.getCurrency(), p.getTurnaround(),
                includesList, p.isActive());
    }
}
