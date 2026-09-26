package zm.eoz.platform.testimonial;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

/** Public list of active testimonials for the home page, plus administrator management. */
@RestController
public class TestimonialController {

    public record TestimonialResponse(
            UUID id, String authorName, String authorRole, String quote, boolean active, int sortOrder, Instant createdAt) {
        static TestimonialResponse from(Testimonial t) {
            return new TestimonialResponse(
                    t.getId(), t.getAuthorName(), t.getAuthorRole(), t.getQuote(), t.isActive(), t.getSortOrder(), t.getCreatedAt());
        }
    }

    public record TestimonialRequest(
            @NotBlank @Size(max = 120) String authorName,
            @Size(max = 160) String authorRole,
            @NotBlank @Size(min = 10, max = 600) String quote,
            Boolean active,
            Integer sortOrder) {}

    private final TestimonialRepository repository;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public TestimonialController(TestimonialRepository repository, AuditService auditService, UserRepository userRepository) {
        this.repository = repository;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @GetMapping("/api/v1/testimonials")
    public ApiResponse<List<TestimonialResponse>> published() {
        return ApiResponse.of(repository.findByActiveTrueOrderBySortOrderAscCreatedAtDesc().stream()
                .map(TestimonialResponse::from)
                .toList());
    }

    @GetMapping("/api/v1/admin/testimonials")
    @PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
    public ApiResponse<List<TestimonialResponse>> all() {
        return ApiResponse.of(repository.findAllByOrderBySortOrderAscCreatedAtDesc().stream()
                .map(TestimonialResponse::from)
                .toList());
    }

    @PostMapping("/api/v1/admin/testimonials")
    @PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
    @Transactional
    public ApiResponse<TestimonialResponse> create(@Valid @RequestBody TestimonialRequest request) {
        Testimonial t = new Testimonial();
        apply(t, request);
        t = repository.save(t);
        auditService.record(currentUser(), "TESTIMONIAL_CREATED", "Testimonial", t.getId().toString(),
                "Added testimonial from " + t.getAuthorName());
        return ApiResponse.of(TestimonialResponse.from(t));
    }

    @PatchMapping("/api/v1/admin/testimonials/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
    @Transactional
    public ApiResponse<TestimonialResponse> update(@PathVariable UUID id, @Valid @RequestBody TestimonialRequest request) {
        Testimonial t = find(id);
        apply(t, request);
        auditService.record(currentUser(), "TESTIMONIAL_UPDATED", "Testimonial", id.toString(),
                "Updated testimonial from " + t.getAuthorName() + (t.isActive() ? "" : " (hidden)"));
        return ApiResponse.of(TestimonialResponse.from(t));
    }

    @DeleteMapping("/api/v1/admin/testimonials/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Testimonial t = find(id);
        repository.delete(t);
        auditService.record(currentUser(), "TESTIMONIAL_DELETED", "Testimonial", id.toString(),
                "Deleted testimonial from " + t.getAuthorName());
        return ResponseEntity.noContent().build();
    }

    private static void apply(Testimonial t, TestimonialRequest r) {
        t.setAuthorName(r.authorName().trim());
        t.setAuthorRole(r.authorRole() == null || r.authorRole().isBlank() ? null : r.authorRole().trim());
        t.setQuote(r.quote().trim());
        if (r.active() != null) t.setActive(r.active());
        if (r.sortOrder() != null) t.setSortOrder(r.sortOrder());
    }

    private Testimonial find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Testimonial not found: " + id));
    }

    private User currentUser() {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
