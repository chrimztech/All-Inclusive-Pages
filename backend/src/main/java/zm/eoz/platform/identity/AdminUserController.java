package zm.eoz.platform.identity;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.identity.dto.AdminCreateUserRequest;
import zm.eoz.platform.identity.dto.RoleAssignmentRequest;
import zm.eoz.platform.identity.dto.StatusChangeRequest;
import zm.eoz.platform.identity.dto.UserAdminResponse;
import zm.eoz.platform.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasAuthority('USER_MANAGE')")
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final UserRepository userRepository;

    public AdminUserController(AdminUserService adminUserService, UserRepository userRepository) {
        this.adminUserService = adminUserService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<PageResponse<UserAdminResponse>> list(@RequestParam(required = false) String q, Pageable pageable) {
        return ApiResponse.of(PageResponse.from(adminUserService.list(q, pageable)));
    }

    @PostMapping
    public ApiResponse<UserAdminResponse> create(@Valid @RequestBody AdminCreateUserRequest request) {
        return ApiResponse.of(adminUserService.createUser(request, currentUser()));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<UserAdminResponse> changeStatus(@PathVariable UUID id, @Valid @RequestBody StatusChangeRequest request) {
        return ApiResponse.of(adminUserService.changeStatus(id, request.status(), currentUser()));
    }

    @PatchMapping("/{id}")
    public ApiResponse<UserAdminResponse> update(
            @PathVariable UUID id, @Valid @RequestBody zm.eoz.platform.identity.dto.AdminUpdateUserRequest request) {
        return ApiResponse.of(adminUserService.updateDetails(id, request.fullName(), request.phone(), currentUser()));
    }

    @PostMapping("/{id}/reset-password")
    public ApiResponse<java.util.Map<String, String>> resetPassword(
            @PathVariable UUID id, @Valid @RequestBody zm.eoz.platform.identity.dto.AdminResetPasswordRequest request) {
        String password = adminUserService.resetPassword(id, request.newPassword(), currentUser());
        return ApiResponse.of(java.util.Map.of("temporaryPassword", password));
    }

    @PatchMapping("/{id}/roles")
    public ApiResponse<UserAdminResponse> assignRoles(@PathVariable UUID id, @Valid @RequestBody RoleAssignmentRequest request) {
        return ApiResponse.of(adminUserService.assignRoles(id, request.roles(), currentUser()));
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
