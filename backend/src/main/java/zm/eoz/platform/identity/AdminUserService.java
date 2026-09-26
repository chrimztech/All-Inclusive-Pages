package zm.eoz.platform.identity;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.dto.AdminCreateUserRequest;
import zm.eoz.platform.identity.dto.UserAdminResponse;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;

    public AdminUserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            AuditService auditService,
            PasswordEncoder passwordEncoder,
            RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserAdminResponse createUser(AdminCreateUserRequest request, User actor) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("An account with this email already exists.");
        }
        Role role = roleRepository
                .findByName(request.role())
                .orElseThrow(() -> new BadRequestException("Unknown role: " + request.role()));

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(request.email().toLowerCase());
        user.setPhone(request.phone());
        String password = request.password() == null || request.password().isBlank()
                ? TemporaryPassword.generate()
                : request.password();
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
        user.setRoles(Set.of(role));
        user.setEmailVerified(true);
        user = userRepository.save(user);

        auditService.record(actor, "USER_CREATED", "User", user.getId().toString(), "Created " + user.getEmail() + " with role " + request.role());
        return UserAdminResponse.from(user).withTemporaryPassword(password);
    }

    @Transactional(readOnly = true)
    public Page<UserAdminResponse> list(String query, Pageable pageable) {
        String q = query == null ? "" : query;
        return userRepository.findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q, pageable)
                .map(UserAdminResponse::from);
    }

    @Transactional
    public UserAdminResponse changeStatus(UUID userId, String status, zm.eoz.platform.identity.User actor) {
        User user = requireUser(userId);
        UserStatus target;
        try {
            target = UserStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status: " + status);
        }
        user.setStatus(target);
        auditService.record(actor, "USER_STATUS_CHANGED", "User", user.getId().toString(), "Set status to " + target);
        return UserAdminResponse.from(user);
    }

    @Transactional
    public UserAdminResponse updateDetails(UUID userId, String fullName, String phone, User actor) {
        User user = requireUser(userId);
        user.setFullName(fullName.trim());
        user.setPhone(phone == null || phone.isBlank() ? null : phone.trim());
        auditService.record(actor, "USER_UPDATED", "User", user.getId().toString(), "Updated details for " + user.getEmail());
        return UserAdminResponse.from(user);
    }

    @Transactional
    public String resetPassword(UUID userId, String newPassword, User actor) {
        User user = requireUser(userId);
        String password = newPassword == null || newPassword.isBlank() ? TemporaryPassword.generate() : newPassword;
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
        refreshTokenRepository.findByUser_IdAndRevokedFalse(user.getId()).forEach(rt -> rt.setRevoked(true));
        auditService.record(actor, "USER_PASSWORD_RESET", "User", user.getId().toString(), "Password reset for " + user.getEmail());
        return password;
    }

    @Transactional
    public UserAdminResponse assignRoles(UUID userId, List<String> roleNames, zm.eoz.platform.identity.User actor) {
        User user = requireUser(userId);
        Set<Role> roles = roleNames.stream()
                .map(name -> roleRepository.findByName(name).orElseThrow(() -> new BadRequestException("Unknown role: " + name)))
                .collect(Collectors.toSet());
        user.setRoles(roles);
        auditService.record(actor, "USER_ROLES_CHANGED", "User", user.getId().toString(), "Set roles to " + roleNames);
        return UserAdminResponse.from(user);
    }

    private User requireUser(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found: " + id));
    }
}
