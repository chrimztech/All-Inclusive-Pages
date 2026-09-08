package zm.eoz.platform.common;

import java.util.List;
import org.springframework.data.domain.Page;

/** Page envelope for list endpoints, decoupled from the Spring Data Page type. */
public record PageResponse<T>(List<T> items, int page, int size, long totalElements, int totalPages) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
