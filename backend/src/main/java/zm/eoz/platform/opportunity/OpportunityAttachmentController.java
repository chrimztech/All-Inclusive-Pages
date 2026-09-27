package zm.eoz.platform.opportunity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
import zm.eoz.platform.storage.FileAsset;
import zm.eoz.platform.storage.FileStorageService;

/** Listing attachments: public read for published listings, managed by the listing's owners and moderators. */
@RestController
@RequestMapping("/api/v1/opportunities")
@Tag(name = "Listing attachments")
public class OpportunityAttachmentController {

    private final OpportunityAttachmentService attachments;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;

    public OpportunityAttachmentController(
            OpportunityAttachmentService attachments, FileStorageService fileStorageService, UserRepository userRepository) {
        this.attachments = attachments;
        this.fileStorageService = fileStorageService;
        this.userRepository = userRepository;
    }

    @GetMapping("/{id}/attachments")
    @Operation(summary = "A listing's attachments (published listings: anyone; otherwise its managers)")
    public ApiResponse<List<OpportunityAttachmentService.Attachment>> list(@PathVariable UUID id) {
        return ApiResponse.of(attachments.list(id, optionalUser()));
    }

    @PostMapping("/manage/{id}/attachments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Attach a PDF, Word document or image (max 5 per listing, 10 MB each)")
    public ApiResponse<OpportunityAttachmentService.Attachment> add(
            @PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        return ApiResponse.of(attachments.add(id, file, optionalUser()));
    }

    @DeleteMapping("/manage/{id}/attachments/{attachmentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> remove(@PathVariable UUID id, @PathVariable UUID attachmentId) {
        attachments.remove(id, attachmentId, optionalUser());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/attachments/{attachmentId}/download")
    @Operation(summary = "Download an attachment (same visibility as the list)")
    public ResponseEntity<Resource> download(@PathVariable UUID attachmentId) {
        FileAsset asset = attachments.forDownload(attachmentId, optionalUser());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(asset.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(asset.getFileName(), StandardCharsets.UTF_8).build().toString())
                .body(fileStorageService.load(asset));
    }

    private User optionalUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) return null;
        return userRepository.findById(principal.getId()).orElse(null);
    }
}
