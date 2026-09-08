package zm.eoz.platform.candidate;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.application.CandidateApplicationRepository;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.candidate.dto.AlertSubscriptionRequest;
import zm.eoz.platform.candidate.dto.AlertSubscriptionResponse;
import zm.eoz.platform.candidate.dto.CandidateProfileRequest;
import zm.eoz.platform.candidate.dto.CandidateProfileResponse;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserStatus;
import zm.eoz.platform.opportunity.OpportunityCategoryRepository;
import zm.eoz.platform.storage.FileAsset;
import zm.eoz.platform.storage.FileStorageService;

@Service
public class CandidateService {

    private final CandidateProfileRepository profileRepository;
    private final AlertSubscriptionRepository alertRepository;
    private final OpportunityCategoryRepository categoryRepository;
    private final CandidateApplicationRepository applicationRepository;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    public CandidateService(
            CandidateProfileRepository profileRepository,
            AlertSubscriptionRepository alertRepository,
            OpportunityCategoryRepository categoryRepository,
            CandidateApplicationRepository applicationRepository,
            FileStorageService fileStorageService,
            AuditService auditService) {
        this.profileRepository = profileRepository;
        this.alertRepository = alertRepository;
        this.categoryRepository = categoryRepository;
        this.applicationRepository = applicationRepository;
        this.fileStorageService = fileStorageService;
        this.auditService = auditService;
    }

    @Transactional
    public CandidateProfileResponse getProfile(User user) {
        return CandidateProfileResponse.from(profileRepository.findById(user.getId()).orElseGet(() -> new CandidateProfile(user.getId())));
    }

    @Transactional
    public CandidateProfileResponse updateProfile(CandidateProfileRequest request, User user) {
        CandidateProfile profile = profileRepository.findById(user.getId()).orElseGet(() -> new CandidateProfile(user.getId()));
        profile.setHeadline(request.headline());
        profile.setBio(request.bio());
        profile.setLocation(request.location());
        profile.setEducationSummary(request.educationSummary());
        profile.setExperienceSummary(request.experienceSummary());
        profile.setSkills(request.skills());
        profile.setUpdatedAt(java.time.Instant.now());
        return CandidateProfileResponse.from(profileRepository.save(profile));
    }

    @Transactional
    public AlertSubscriptionResponse createAlert(AlertSubscriptionRequest request, User user) {
        AlertSubscription alert = new AlertSubscription();
        alert.setUser(user);
        alert.setKeyword(request.keyword());
        alert.setRegion(request.region());
        if (request.categoryCode() != null && !request.categoryCode().isBlank()) {
            alert.setCategory(categoryRepository
                    .findByCodeIgnoreCase(request.categoryCode())
                    .orElseThrow(() -> new BadRequestException("Unknown category: " + request.categoryCode())));
        }
        if (request.frequency() != null) {
            try {
                alert.setFrequency(AlertSubscription.Frequency.valueOf(request.frequency()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown frequency: " + request.frequency());
            }
        }
        return AlertSubscriptionResponse.from(alertRepository.save(alert));
    }

    @Transactional(readOnly = true)
    public List<AlertSubscriptionResponse> listAlerts(UUID userId) {
        return alertRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(AlertSubscriptionResponse::from).toList();
    }

    @Transactional
    public void deleteAlert(UUID alertId, UUID userId) {
        AlertSubscription alert =
                alertRepository.findById(alertId).orElseThrow(() -> new NotFoundException("Alert not found: " + alertId));
        if (!alert.getUser().getId().equals(userId)) {
            throw new zm.eoz.platform.common.exception.ForbiddenException("This alert does not belong to you.");
        }
        alertRepository.delete(alert);
    }

    @Transactional(readOnly = true)
    public List<FileAsset> listDocuments(UUID userId) {
        return fileStorageService.listForOwner("CANDIDATE_DOCUMENT", userId.toString());
    }

    /** Ownership is always derived from the authenticated caller, never trusted from client input. */
    @Transactional
    public FileAsset uploadDocument(org.springframework.web.multipart.MultipartFile file, User user) {
        return fileStorageService.store(file, "CANDIDATE_DOCUMENT", user.getId().toString(), user);
    }

    @Transactional
    public Map<String, Object> exportPrivacyData(User user) {
        return Map.of(
                "profile", getProfile(user),
                "alerts", listAlerts(user.getId()),
                "applications", applicationRepository.findByCandidateIdOrderBySubmittedAtDesc(user.getId()),
                "documents",
                        listDocuments(user.getId()).stream()
                                .map(d -> Map.of("fileName", d.getFileName(), "uploadedAt", d.getUploadedAt().toString()))
                                .toList());
    }

    @Transactional
    public void requestAccountDeletion(User user) {
        user.setStatus(UserStatus.DEACTIVATED);
        auditService.record(
                user, "ACCOUNT_DELETION_REQUESTED", "User", user.getId().toString(),
                "Candidate requested account deletion; account deactivated pending retention-policy erasure");
    }
}
