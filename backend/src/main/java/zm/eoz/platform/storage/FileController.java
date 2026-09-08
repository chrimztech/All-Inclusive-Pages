package zm.eoz.platform.storage;

import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

/**
 * Generic authenticated upload/download used by organisation verification, service
 * deliverables and candidate documents. Callers are trusted to pass a sensible ownerType;
 * fine-grained per-owner authorisation (e.g. "is this my own order") is enforced by the
 * feature controllers before they hand out a file id, not here.
 */
@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;

    public FileController(FileStorageService fileStorageService, UserRepository userRepository) {
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ApiResponse<FileAssetResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("ownerType") String ownerType,
            @RequestParam("ownerId") String ownerId) {
        FileAsset asset = fileStorageService.store(file, ownerType, ownerId, currentUser());
        return ApiResponse.of(FileAssetResponse.from(asset));
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<Void> delete(@PathVariable UUID id) {
        fileStorageService.delete(id, currentUser());
        return org.springframework.http.ResponseEntity.noContent().build();
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        FileAsset asset = fileStorageService.getForDownload(id, currentUser());
        Resource resource = fileStorageService.load(asset);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(asset.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + asset.getFileName() + "\"")
                .body(resource);
    }

    public record FileAssetResponse(UUID id, String fileName, String contentType, long sizeBytes) {
        static FileAssetResponse from(FileAsset asset) {
            return new FileAssetResponse(asset.getId(), asset.getFileName(), asset.getContentType(), asset.getSizeBytes());
        }
    }
}
