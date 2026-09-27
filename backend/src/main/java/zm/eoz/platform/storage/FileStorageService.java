package zm.eoz.platform.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
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
import zm.eoz.platform.security.Access;

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
    private final zm.eoz.platform.organisation.OrganisationMemberRepository memberRepository;

    public FileStorageService(
            @Value("${eoz.storage.local-dir:./data/uploads}") String localDir,
            FileAssetRepository fileAssetRepository,
            zm.eoz.platform.organisation.OrganisationMemberRepository memberRepository) {
        this.rootDir = Path.of(localDir);
        this.fileAssetRepository = fileAssetRepository;
        this.memberRepository = memberRepository;
        try {
            Files.createDirectories(rootDir);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + rootDir, e);
        }
    }

    @Transactional
    /** Leading "magic" bytes of each accepted type. */
    static boolean matchesSignature(String contentType, byte[] head) {
        return switch (contentType) {
            case "application/pdf" -> startsWith(head, new byte[] {'%', 'P', 'D', 'F', '-'});
            case "image/png" -> startsWith(head, new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A});
            case "image/jpeg" -> startsWith(head, new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
            // .docx is a ZIP container; legacy .doc is an OLE2 compound file.
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ->
                    startsWith(head, new byte[] {'P', 'K', 0x03, 0x04});
            case "application/msword" -> startsWith(head,
                    new byte[] {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1});
            default -> false;
        };
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) return false;
        }
        return true;
    }

    /** Keeps only the base name (some browsers send a full path) without control characters, at most 200 chars. */
    static String safeFileName(String original, String fallback) {
        if (original == null || original.isBlank()) return fallback;
        String name = original.substring(Math.max(original.lastIndexOf('/'), original.lastIndexOf('\\')) + 1)
                .replaceAll("[\\p{Cntrl}]", "").trim();
        if (name.isEmpty()) return fallback;
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

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
        // The declared type comes from the browser and can be anything; check the file really is that type.
        byte[] head;
        try (InputStream in = file.getInputStream()) {
            head = in.readNBytes(8);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read the uploaded file.", e);
        }
        if (!matchesSignature(contentType, head)) {
            throw new BadRequestException("This file's contents don't match its type. Upload a real PDF, Word document,"
                    + " PNG or JPEG file.");
        }

        String storageKey = UUID.randomUUID().toString();
        Path target = rootDir.resolve(storageKey);
        try (InputStream in = file.getInputStream(); OutputStream out = Files.newOutputStream(target)) {
            in.transferTo(out);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store uploaded file.", e);
        }

        FileAsset asset = new FileAsset();
        asset.setOwnerType(ownerType);
        asset.setOwnerId(ownerId);
        asset.setFileName(safeFileName(file.getOriginalFilename(), storageKey));
        asset.setContentType(contentType);
        asset.setSizeBytes(file.getSize());
        asset.setStorageKey(storageKey);
        asset.setUploadedBy(uploadedBy);
        return fileAssetRepository.save(asset);
    }

    public List<FileAsset> listForOwner(String ownerType, String ownerId) {
        return fileAssetRepository.findByOwnerTypeAndOwnerIdOrderByUploadedAtDesc(ownerType, ownerId);
    }


    public FileAsset get(UUID id) {
        return fileAssetRepository.findById(id).orElseThrow(() -> new NotFoundException("File not found: " + id));
    }

    /**
     * Who may download a file through the generic endpoint. Least privilege: being staff is not enough — the
     * permission must match what the file is.
     * <ul>
     *   <li>the uploader, always;</li>
     *   <li>organisation logos: anyone (they are shown publicly);</li>
     *   <li>candidate documents: the candidate, or recruitment staff (APPLICATION_MANAGE). Employers get an
     *       applicant's CV only through the application endpoint, which checks they own the listing;</li>
     *   <li>verification evidence: members of that organisation, or verifiers (ORGANISATION_VERIFY);</li>
     *   <li>listing attachments: moderators (the public endpoint handles everyone else);</li>
     *   <li>anything else: system administrators (SYSTEM_MANAGE).</li>
     * </ul>
     */
    public FileAsset getForDownload(UUID id, User requester) {
        FileAsset asset = get(id);
        if (!canDownload(asset, requester)) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You do not have access to this file.");
        }
        return asset;
    }

    boolean canDownload(FileAsset asset, User requester) {
        if (asset.getUploadedBy() != null && asset.getUploadedBy().getId().equals(requester.getId())) return true;
        String owner = asset.getOwnerId();
        return switch (asset.getOwnerType() == null ? "" : asset.getOwnerType()) {
            case "ORGANISATION_LOGO" -> true;
            case "CANDIDATE_DOCUMENT" -> requester.getId().toString().equals(owner)
                    || Access.hasAny(requester, "APPLICATION_MANAGE");
            case "ORGANISATION_VERIFICATION" -> isMember(owner, requester) || Access.hasAny(requester, "ORGANISATION_VERIFY");
            case "OPPORTUNITY_ATTACHMENT" -> Access.hasAny(requester, "OPPORTUNITY_MODERATE");
            default -> Access.hasAny(requester, "SYSTEM_MANAGE");
        };
    }

    /**
     * The generic upload endpoint only accepts the two kinds of file that are attached afterwards by a separate,
     * checked call: a person's own documents (owner is forced to the uploader) and an organisation logo (uploader
     * must belong to that organisation). Everything else has its own upload endpoint, so a caller can never file a
     * document under someone else's record.
     */
    public FileAsset storeGeneric(MultipartFile file, String ownerType, String ownerId, User uploader) {
        if ("CANDIDATE_DOCUMENT".equals(ownerType)) {
            return store(file, ownerType, uploader.getId().toString(), uploader);
        }
        if ("ORGANISATION_LOGO".equals(ownerType)) {
            if (!isMember(ownerId, uploader) && !Access.hasAny(uploader, "ORGANISATION_VERIFY")) {
                throw new zm.eoz.platform.common.exception.ForbiddenException("You are not a member of this organisation.");
            }
            return store(file, ownerType, ownerId, uploader);
        }
        throw new BadRequestException("Files of type " + ownerType + " are uploaded through their own page.");
    }

    /** A file someone is about to use as their photo, CV or logo must be one they uploaded themselves. */
    public void requireOwnUpload(UUID fileId, User user, boolean imageOnly) {
        FileAsset asset = get(fileId);
        if (asset.getUploadedBy() == null || !asset.getUploadedBy().getId().equals(user.getId())) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("You can only use files you uploaded.");
        }
        if (imageOnly && (asset.getContentType() == null || !asset.getContentType().startsWith("image/"))) {
            throw new BadRequestException("Choose a PNG or JPEG image.");
        }
    }

    private boolean isMember(String organisationId, User user) {
        try {
            return memberRepository
                    .findById_OrganisationIdAndId_UserId(UUID.fromString(organisationId), user.getId())
                    .isPresent();
        } catch (IllegalArgumentException | NullPointerException e) {
            return false;
        }
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

    /** Removes the physical file only; callers are responsible for deleting the matching database row. */
    public void deleteStoredFile(String storageKey) {
        try {
            Files.deleteIfExists(rootDir.resolve(storageKey));
        } catch (IOException e) {
            // A leftover orphan file is preferable to failing a delete that already committed.
        }
    }

    public Resource load(FileAsset asset) {
        Path path = rootDir.resolve(asset.getStorageKey());
        if (!Files.exists(path)) {
            throw new NotFoundException("Stored file is missing on disk: " + asset.getStorageKey());
        }
        return new FileSystemResource(path);
    }
}
