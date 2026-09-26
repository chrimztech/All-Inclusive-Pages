package zm.eoz.platform.candidate;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/candidate/profile")
@PreAuthorize("hasRole('CANDIDATE')")
public class CandidateCredentialsController {

    public record LanguageRequest(String language, String proficiency) {}

    public record CertificationRequest(
            String name, String issuer, LocalDate issuedOn, LocalDate expiresOn, String credentialUrl) {}

    private final CandidateCredentialsService service;

    public CandidateCredentialsController(CandidateCredentialsService service) {
        this.service = service;
    }

    @GetMapping("/languages")
    public ApiResponse<List<CandidateCredentialsService.Language>> languages() {
        return ApiResponse.of(service.languages(userId()));
    }

    @PostMapping("/languages")
    public ApiResponse<CandidateCredentialsService.Language> addLanguage(@RequestBody LanguageRequest request) {
        return ApiResponse.of(service.addLanguage(userId(), request.language(), request.proficiency()));
    }

    @DeleteMapping("/languages/{id}")
    public ResponseEntity<Void> removeLanguage(@PathVariable UUID id) {
        service.removeLanguage(userId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/certifications")
    public ApiResponse<List<CandidateCredentialsService.Certification>> certifications() {
        return ApiResponse.of(service.certifications(userId()));
    }

    @PostMapping("/certifications")
    public ApiResponse<List<CandidateCredentialsService.Certification>> addCertification(
            @RequestBody CertificationRequest request) {
        service.addCertification(
                userId(), request.name(), request.issuer(), request.issuedOn(), request.expiresOn(), request.credentialUrl());
        return ApiResponse.of(service.certifications(userId()));
    }

    @DeleteMapping("/certifications/{id}")
    public ResponseEntity<Void> removeCertification(@PathVariable UUID id) {
        service.removeCertification(userId(), id);
        return ResponseEntity.noContent().build();
    }

    private static UUID userId() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId();
    }
}
