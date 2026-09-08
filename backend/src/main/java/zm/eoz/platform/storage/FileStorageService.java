package zm.eoz.platform.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;

/**
 * Local-disk file storage behind an interface shaped so it can be swapped for an
 * S3-compatible object store in production without touching callers.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/png",
            "image/jpeg");
    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;

    private final Path rootDir;
    private final FileAssetRepository fileAssetRepository;

    public FileStorageService(
            @Value("${eoz.storage.local-dir:./data/uploads}") String localDir,
            FileAssetRepository fileAssetRepository) {
        this.rootDir = Path.of(localDir);
        this.fileAssetRepository = fileAssetRepository;
        try {
            Files.createDirectories(rootDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + rootDir, e);
        }
    }

    @Transactional
    public FileAsset store(MultipartFile file, String ownerType, String ownerId, User uploadedBy) {
        if (file.isEmpty()) {
            throw new BadRequestException("The uploaded file is empty.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BadRequestException("Files must be 10MB or smaller.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Unsupported file type: " + contentType);
        }

        String storageKey = UUID.randomUUID().toString();
        Path target = rootDir.resolve(storageKey);
        try {
            file.getInputStream().transferTo(Files.newOutputStream(target));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store uploaded file.", e);
        }

        FileAsset asset = new FileAsset();
        asset.setOwnerType(ownerType);
        asset.setOwnerId(ownerId);
        asset.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : storageKey);
        asset.setContentType(contentType);
        asset.setSizeBytes(file.getSize());
        asset.setStorageKey(storageKey);
        asset.setUploadedBy(uploadedBy);
        return fileAssetRepository.save(asset);
    }

    public List<FileAsset> listForOwner(String ownerType, String ownerId) {
        return fileAssetRepository.findByOwnerTypeAndOwnerIdOrderByUploadedAtDesc(ownerType, ownerId);
    }

    private static final Set<String> STAFF_ROLES = Set.of(
            "CONTENT_OFFICER", "RECRUITMENT_OFFICER", "SERVICE_OFFICER", "FINANCE_OFFICER", "MANAGER", "ADMIN", "AUDITOR");

    public FileAsset get(UUID id) {
        return fileAssetRepository.findById(id).orElseThrow(() -> new NotFoundException("File not found: " + id));
    }

    /** Only the uploader or staff may read/download a file's bytes — never any other authenticated user. */
    public FileAsset getForDownload(UUID id, User requester) {
        FileAsset asset = get(id);
        boolean isOwner = asset.getUploadedBy() != null && asset.getUploadedBy().getId().equals(requester.getId());
        boolean isStaff = requester.getRoles().stream().anyMatch(r -> STAFF_ROLES.contains(r.getName()));
        if (!isOwner && !isStaff) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You do not have access to this file.");
        }
        return asset;
    }

    @Transactional
    public void delete(UUID id, User requester) {
        FileAsset asset = get(id);
        if (asset.getUploadedBy() == null || !asset.getUploadedBy().getId().equals(requester.getId())) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You can only delete files you uploaded.");
        }
        try {
            Files.deleteIfExists(rootDir.resolve(asset.getStorageKey()));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to delete stored file.", e);
        }
        fileAssetRepository.delete(asset);
    }

    public Resource load(FileAsset asset) {
        Path path = rootDir.resolve(asset.getStorageKey());
        if (!Files.exists(path)) {
            throw new NotFoundException("Stored file is missing on disk: " + asset.getStorageKey());
        }
        return new FileSystemResource(path);
    }
}
