package zm.eoz.platform.opportunity;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Locale;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.opportunity.dto.AdminCategoryResponse;
import zm.eoz.platform.opportunity.dto.CategoryRequest;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/admin/categories")
@PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
public class AdminCategoryController {

    private final OpportunityCategoryRepository categoryRepository;
    private final OpportunityRepository opportunityRepository;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public AdminCategoryController(
            OpportunityCategoryRepository categoryRepository,
            OpportunityRepository opportunityRepository,
            AuditService auditService,
            UserRepository userRepository) {
        this.categoryRepository = categoryRepository;
        this.opportunityRepository = opportunityRepository;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ApiResponse<List<AdminCategoryResponse>> list() {
        return ApiResponse.of(categoryRepository.findAll().stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(c -> toResponse(c))
                .toList());
    }

    @PostMapping
    @Transactional
    public ApiResponse<AdminCategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        String code = (request.code() == null || request.code().isBlank() ? request.name() : request.code())
                .trim()
                .toUpperCase(Locale.ROOT);
        if (categoryRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new ConflictException("A category with the code " + code + " already exists.");
        }
        OpportunityCategory category = new OpportunityCategory();
        category.setId(UUID.randomUUID());
        category.setCode(code);
        category.setName(request.name().trim());
        category.setDescription(request.description());
        category = categoryRepository.save(category);
        auditService.record(currentUser(), "CATEGORY_CREATED", "OpportunityCategory", code, "Created category " + category.getName());
        return ApiResponse.of(toResponse(category));
    }

    @PatchMapping("/{id}")
    @Transactional
    public ApiResponse<AdminCategoryResponse> update(@PathVariable UUID id, @Valid @RequestBody CategoryRequest request) {
        OpportunityCategory category = categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Category not found."));
        category.setName(request.name().trim());
        category.setDescription(request.description());
        auditService.record(currentUser(), "CATEGORY_UPDATED", "OpportunityCategory", category.getCode(), "Updated category " + category.getName());
        return ApiResponse.of(toResponse(category));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        OpportunityCategory category = categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Category not found."));
        if (opportunityRepository.countByCategoryId(id) > 0) {
            throw new BadRequestException("This category is used by listings. Move or delete those listings first.");
        }
        categoryRepository.delete(category);
        auditService.record(currentUser(), "CATEGORY_DELETED", "OpportunityCategory", category.getCode(), "Deleted category " + category.getName());
        return ResponseEntity.noContent().build();
    }

    private AdminCategoryResponse toResponse(OpportunityCategory c) {
        return new AdminCategoryResponse(
                c.getId(), c.getCode(), c.getName(), c.getDescription(), opportunityRepository.countByCategoryId(c.getId()));
    }

    private User currentUser() {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
