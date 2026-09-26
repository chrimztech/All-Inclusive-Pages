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
import zm.eoz.platform.candidate.dto.EducationRequest;
import zm.eoz.platform.candidate.dto.EducationResponse;
import zm.eoz.platform.candidate.dto.WorkExperienceRequest;
import zm.eoz.platform.candidate.dto.WorkExperienceResponse;
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
    private final CandidateCredentialsService credentialsService;
    private final CandidateWorkExperienceRepository workExperienceRepository;
    private final CandidateEducationRepository educationRepository;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;

    public CandidateService(
            CandidateProfileRepository profileRepository,
            AlertSubscriptionRepository alertRepository,
            OpportunityCategoryRepository categoryRepository,
            CandidateApplicationRepository applicationRepository,
            CandidateCredentialsService credentialsService,
            CandidateWorkExperienceRepository workExperienceRepository,
            CandidateEducationRepository educationRepository,
            FileStorageService fileStorageService,
            AuditService auditService) {
        this.profileRepository = profileRepository;
        this.alertRepository = alertRepository;
        this.categoryRepository = categoryRepository;
        this.applicationRepository = applicationRepository;
        this.credentialsService = credentialsService;
        this.workExperienceRepository = workExperienceRepository;
        this.educationRepository = educationRepository;
        this.fileStorageService = fileStorageService;
        this.auditService = auditService;
    }

    @Transactional
    public CandidateProfileResponse getProfile(User user) {
        return toResponse(profileRepository.findById(user.getId()).orElseGet(() -> new CandidateProfile(user.getId())), user.getId());
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
        profile.setAvailability(parseAvailability(request.availability()));
        profile.setSalaryExpectationMin(request.salaryExpectationMin());
        profile.setSalaryExpectationMax(request.salaryExpectationMax());
        profile.setSalaryCurrency(request.salaryCurrency());
        profile.setLinkedinUrl(request.linkedinUrl());
        profile.setPortfolioUrl(request.portfolioUrl());
        profile.setUpdatedAt(java.time.Instant.now());
        return toResponse(profileRepository.save(profile), user.getId());
    }

    @Transactional
    public CandidateProfileResponse setPhoto(UUID fileId, User user) {
        CandidateProfile profile = profileRepository.findById(user.getId()).orElseGet(() -> new CandidateProfile(user.getId()));
        profile.setPhotoFileId(fileId);
        profile.setUpdatedAt(java.time.Instant.now());
        return toResponse(profileRepository.save(profile), user.getId());
    }

    @Transactional
    public CandidateProfileResponse setResume(UUID fileId, User user) {
        CandidateProfile profile = profileRepository.findById(user.getId()).orElseGet(() -> new CandidateProfile(user.getId()));
        profile.setResumeFileId(fileId);
        profile.setUpdatedAt(java.time.Instant.now());
        return toResponse(profileRepository.save(profile), user.getId());
    }

    private CandidateProfileResponse toResponse(CandidateProfile profile, UUID candidateUserId) {
        List<WorkExperienceResponse> workExperience = listWorkExperience(candidateUserId);
        List<EducationResponse> education = listEducation(candidateUserId);
        return CandidateProfileResponse.from(profile, workExperience, education);
    }

    private Availability parseAvailability(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Availability.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown availability: " + value);
        }
    }

    @Transactional(readOnly = true)
    public List<WorkExperienceResponse> listWorkExperience(UUID candidateUserId) {
        return workExperienceRepository.findByCandidateUserIdOrderByDisplayOrderAscStartDateDesc(candidateUserId).stream()
                .map(WorkExperienceResponse::from)
                .toList();
    }

    @Transactional
    public WorkExperienceResponse addWorkExperience(WorkExperienceRequest request, User user) {
        CandidateWorkExperience entry = new CandidateWorkExperience();
        entry.setCandidateUserId(user.getId());
        applyWorkExperience(entry, request);
        return WorkExperienceResponse.from(workExperienceRepository.save(entry));
    }

    @Transactional
    public WorkExperienceResponse updateWorkExperience(UUID id, WorkExperienceRequest request, User user) {
        CandidateWorkExperience entry = workExperienceRepository
                .findById(id)
                .filter(e -> e.getCandidateUserId().equals(user.getId()))
                .orElseThrow(() -> new NotFoundException("Work experience entry not found: " + id));
        applyWorkExperience(entry, request);
        return WorkExperienceResponse.from(workExperienceRepository.save(entry));
    }

    private void applyWorkExperience(CandidateWorkExperience entry, WorkExperienceRequest request) {
        entry.setTitle(request.title());
        entry.setEmployerName(request.employerName());
        entry.setStartDate(request.startDate());
        entry.setEndDate(request.current() ? null : request.endDate());
        entry.setCurrent(request.current());
        entry.setDescription(request.description());
        entry.setDisplayOrder(request.displayOrder());
    }

    @Transactional
    public void deleteWorkExperience(UUID id, User user) {
        workExperienceRepository.deleteByCandidateUserIdAndId(user.getId(), id);
    }

    @Transactional(readOnly = true)
    public List<EducationResponse> listEducation(UUID candidateUserId) {
        return educationRepository.findByCandidateUserIdOrderByDisplayOrderAscStartDateDesc(candidateUserId).stream()
                .map(EducationResponse::from)
                .toList();
    }

    @Transactional
    public EducationResponse addEducation(EducationRequest request, User user) {
        CandidateEducation entry = new CandidateEducation();
        entry.setCandidateUserId(user.getId());
        applyEducation(entry, request);
        return EducationResponse.from(educationRepository.save(entry));
    }

    @Transactional
    public EducationResponse updateEducation(UUID id, EducationRequest request, User user) {
        CandidateEducation entry = educationRepository
                .findById(id)
                .filter(e -> e.getCandidateUserId().equals(user.getId()))
                .orElseThrow(() -> new NotFoundException("Education entry not found: " + id));
        applyEducation(entry, request);
        return EducationResponse.from(educationRepository.save(entry));
    }

    private void applyEducation(CandidateEducation entry, EducationRequest request) {
        entry.setInstitution(request.institution());
        entry.setQualification(request.qualification());
        entry.setFieldOfStudy(request.fieldOfStudy());
        entry.setStartDate(request.startDate());
        entry.setEndDate(request.endDate());
        entry.setDisplayOrder(request.displayOrder());
    }

    @Transactional
    public void deleteEducation(UUID id, User user) {
        educationRepository.deleteByCandidateUserIdAndId(user.getId(), id);
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
                "languages", credentialsService.languages(user.getId()),
                "certifications", credentialsService.certifications(user.getId()),
                // DTOs only: the entities link to other users (e.g. a listing's creator) and must never be serialised.
                "applications",
                        applicationRepository.findByCandidateIdOrderBySubmittedAtDesc(user.getId()).stream()
                                .map(zm.eoz.platform.application.dto.ApplicationResponse::from)
                                .toList(),
                "documents",
                        listDocuments(user.getId()).stream()
                                .map(d -> Map.of("fileName", d.getFileName(), "uploadedAt", d.getUploadedAt().toString()))
                                .toList());
    }

}
