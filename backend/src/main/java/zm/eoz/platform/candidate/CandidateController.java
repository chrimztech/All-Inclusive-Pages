package zm.eoz.platform.candidate;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import zm.eoz.platform.candidate.dto.AlertSubscriptionRequest;
import zm.eoz.platform.candidate.dto.AlertSubscriptionResponse;
import zm.eoz.platform.candidate.dto.CandidateProfileRequest;
import zm.eoz.platform.candidate.dto.CandidateProfileResponse;
import zm.eoz.platform.candidate.dto.EducationRequest;
import zm.eoz.platform.candidate.dto.EducationResponse;
import zm.eoz.platform.candidate.dto.WorkExperienceRequest;
import zm.eoz.platform.candidate.dto.WorkExperienceResponse;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/candidate")
@PreAuthorize("hasRole('CANDIDATE')")
public class CandidateController {

    private final CandidateService candidateService;
    private final UserRepository userRepository;

    public CandidateController(CandidateService candidateService, UserRepository userRepository) {
        this.candidateService = candidateService;
        this.userRepository = userRepository;
    }

    @GetMapping("/profile")
    public ApiResponse<CandidateProfileResponse> getProfile() {
        return ApiResponse.of(candidateService.getProfile(currentUser()));
    }

    @PatchMapping("/profile")
    public ApiResponse<CandidateProfileResponse> updateProfile(@RequestBody CandidateProfileRequest request) {
        return ApiResponse.of(candidateService.updateProfile(request, currentUser()));
    }

    @PatchMapping("/profile/photo")
    public ApiResponse<CandidateProfileResponse> setPhoto(@RequestBody SetFileRequest request) {
        return ApiResponse.of(candidateService.setPhoto(request.fileId(), currentUser()));
    }

    @PatchMapping("/profile/resume")
    public ApiResponse<CandidateProfileResponse> setResume(@RequestBody SetFileRequest request) {
        return ApiResponse.of(candidateService.setResume(request.fileId(), currentUser()));
    }

    public record SetFileRequest(@jakarta.validation.constraints.NotNull UUID fileId) {}

    @GetMapping("/profile/experience")
    public ApiResponse<List<WorkExperienceResponse>> listWorkExperience() {
        return ApiResponse.of(candidateService.listWorkExperience(currentUser().getId()));
    }

    @PostMapping("/profile/experience")
    public ApiResponse<WorkExperienceResponse> addWorkExperience(@Valid @RequestBody WorkExperienceRequest request) {
        return ApiResponse.of(candidateService.addWorkExperience(request, currentUser()));
    }

    @PatchMapping("/profile/experience/{id}")
    public ApiResponse<WorkExperienceResponse> updateWorkExperience(
            @PathVariable UUID id, @Valid @RequestBody WorkExperienceRequest request) {
        return ApiResponse.of(candidateService.updateWorkExperience(id, request, currentUser()));
    }

    @DeleteMapping("/profile/experience/{id}")
    public ResponseEntity<Void> deleteWorkExperience(@PathVariable UUID id) {
        candidateService.deleteWorkExperience(id, currentUser());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profile/education")
    public ApiResponse<List<EducationResponse>> listEducation() {
        return ApiResponse.of(candidateService.listEducation(currentUser().getId()));
    }

    @PostMapping("/profile/education")
    public ApiResponse<EducationResponse> addEducation(@Valid @RequestBody EducationRequest request) {
        return ApiResponse.of(candidateService.addEducation(request, currentUser()));
    }

    @PatchMapping("/profile/education/{id}")
    public ApiResponse<EducationResponse> updateEducation(@PathVariable UUID id, @Valid @RequestBody EducationRequest request) {
        return ApiResponse.of(candidateService.updateEducation(id, request, currentUser()));
    }

    @DeleteMapping("/profile/education/{id}")
    public ResponseEntity<Void> deleteEducation(@PathVariable UUID id) {
        candidateService.deleteEducation(id, currentUser());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/alerts")
    public ApiResponse<AlertSubscriptionResponse> createAlert(@Valid @RequestBody AlertSubscriptionRequest request) {
        return ApiResponse.of(candidateService.createAlert(request, currentUser()));
    }

    @GetMapping("/alerts")
    public ApiResponse<List<AlertSubscriptionResponse>> listAlerts() {
        return ApiResponse.of(candidateService.listAlerts(currentUser().getId()));
    }

    @DeleteMapping("/alerts/{id}")
    public ResponseEntity<Void> deleteAlert(@PathVariable UUID id) {
        candidateService.deleteAlert(id, currentUser().getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/documents")
    public ApiResponse<List<Map<String, Object>>> listDocuments() {
        List<Map<String, Object>> docs = candidateService.listDocuments(currentUser().getId()).stream()
                .map(d -> Map.<String, Object>of(
                        "id", d.getId(), "fileName", d.getFileName(), "contentType", d.getContentType(), "uploadedAt",
                        d.getUploadedAt().toString()))
                .toList();
        return ApiResponse.of(docs);
    }

    @PostMapping("/documents")
    public ApiResponse<Map<String, Object>> uploadDocument(@RequestParam("file") MultipartFile file) {
        var asset = candidateService.uploadDocument(file, currentUser());
        return ApiResponse.of(Map.of(
                "id", asset.getId(), "fileName", asset.getFileName(), "contentType", asset.getContentType(),
                "uploadedAt", asset.getUploadedAt().toString()));
    }

    @GetMapping("/privacy/export")
    public ApiResponse<Map<String, Object>> exportPrivacyData() {
        return ApiResponse.of(candidateService.exportPrivacyData(currentUser()));
    }

    @PostMapping("/privacy/delete-request")
    public ResponseEntity<Void> requestDeletion() {
        candidateService.requestAccountDeletion(currentUser());
        return ResponseEntity.noContent().build();
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
