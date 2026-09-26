package zm.eoz.platform.export;

import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

/** Staff CSV exports. Permission is checked per export type in ExportService. */
@RestController
@RequestMapping("/api/v1/admin/exports")
@PreAuthorize("isAuthenticated()")
public class ExportController {

    public record ExportRequest(String type) {}

    private final ExportService exportService;
    private final UserRepository userRepository;

    public ExportController(ExportService exportService, UserRepository userRepository) {
        this.exportService = exportService;
        this.userRepository = userRepository;
    }

    @GetMapping("/types")
    public ApiResponse<List<ExportService.TypeView>> types() {
        return ApiResponse.of(exportService.availableTypes(currentUser()));
    }

    @GetMapping
    public ApiResponse<List<ExportService.Job>> list() {
        return ApiResponse.of(exportService.list(currentUser()));
    }

    @PostMapping
    public ApiResponse<ExportService.Job> request(@RequestBody ExportRequest request) {
        return ApiResponse.of(exportService.request(request.type(), currentUser()));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        Path file = exportService.fileFor(id, currentUser());
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new FileSystemResource(file));
    }

    private User currentUser() {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
