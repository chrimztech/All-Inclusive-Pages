package zm.eoz.platform.backup;

import java.nio.file.Files;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.backup.dto.BackupResponse;
import zm.eoz.platform.backup.dto.RestoreFlagResponse;
import zm.eoz.platform.backup.dto.RestoreResponse;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/admin/system/backups")
@PreAuthorize("hasAuthority('SYSTEM_MANAGE')")
public class AdminBackupController {

    private final BackupService backupService;
    private final RestoreFlagService restoreFlagService;
    private final UserRepository userRepository;

    public AdminBackupController(
            BackupService backupService, RestoreFlagService restoreFlagService, UserRepository userRepository) {
        this.backupService = backupService;
        this.restoreFlagService = restoreFlagService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ApiResponse<BackupResponse> trigger() {
        return ApiResponse.of(backupService.trigger(currentUser()));
    }

    @GetMapping
    public ApiResponse<List<BackupResponse>> list() {
        return ApiResponse.of(backupService.list());
    }

    @PostMapping("/{id}/restore")
    public ApiResponse<RestoreResponse> restore(@PathVariable java.util.UUID id, @Valid @RequestBody RestoreRequest request) {
        return ApiResponse.of(backupService.restore(id, request.confirmFileName(), currentUser()));
    }

    public record RestoreRequest(@NotBlank String confirmFileName) {}

    /** Permanently deleted items that came back with a restore, open ones first. */
    @GetMapping("/restore-flags")
    public ApiResponse<List<RestoreFlagResponse>> restoreFlags() {
        return ApiResponse.of(restoreFlagService.list());
    }

    @PostMapping("/restore-flags/{flagId}/keep")
    public ResponseEntity<Void> keep(@PathVariable UUID flagId) {
        restoreFlagService.keep(flagId, currentUser());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/restore-flags/{flagId}/delete-again")
    public ResponseEntity<Void> deleteAgain(@PathVariable UUID flagId) {
        restoreFlagService.deleteAgain(flagId, currentUser());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        SystemBackup backup = backupService.get(id);
        if (backup.getStatus() != SystemBackup.Status.SUCCESS) {
            throw new NotFoundException("This backup did not complete successfully and has no file to download.");
        }
        var path = backupService.resolve(backup);
        if (!Files.exists(path)) {
            throw new NotFoundException("Backup file is missing on disk: " + backup.getFileName());
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + backup.getFileName() + "\"")
                .body(new FileSystemResource(path));
    }

    private User currentUser() {
        var principal = (UserPrincipal)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
