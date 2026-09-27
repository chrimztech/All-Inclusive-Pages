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
    private final zm.eoz.platform.security.PasswordPolicy passwordPolicy;
    private final RefreshTokenRepository refreshTokenRepository;

    private final zm.eoz.platform.security.SecurityAlertService securityAlertService;

    public AdminUserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            AuditService auditService,
            PasswordEncoder passwordEncoder,
            zm.eoz.platform.security.PasswordPolicy passwordPolicy,
            RefreshTokenRepository refreshTokenRepository,
            zm.eoz.platform.security.SecurityAlertService securityAlertService) {
        this.securityAlertService = securityAlertService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
    }

    @Transactional
    public UserAdminResponse createUser(AdminCreateUserRequest request, User actor) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("An account with this email already exists.");
        }
        Role role = roleRepository
                .findByName(request.role())
                .orElseThrow(() -> new BadRequestException("Unknown role: " + request.role()));
        requireCanGrant(Set.of(role), actor);

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(request.email().toLowerCase());
        user.setPhone(request.phone());
        String password = request.password() == null || request.password().isBlank()
                ? TemporaryPassword.generate()
                : request.password();
        if (request.password() != null && !request.password().isBlank()) {
            passwordPolicy.validate(password, request.email(), request.fullName());
        }
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
        if (user.getId().equals(actor.getId())) {
            throw new BadRequestException("You can't change the status of your own account. Ask another administrator.");
        }
        requireCanManage(user, actor);
        if (target != UserStatus.ACTIVE && isAdmin(user)) {
            requireAnotherActiveAdmin(user);
        }
        UserStatus previous = user.getStatus();
        user.setStatus(target);
        if (target == UserStatus.ACTIVE) {
            // Re-activating also lifts a failed-sign-in lockout.
            user.setFailedLoginCount(0);
            user.setLockedUntil(null);
        } else {
            // Suspended or deactivated accounts lose every signed-in session straight away.
            refreshTokenRepository.findByUser_IdAndRevokedFalse(user.getId()).forEach(t -> t.setRevoked(true));
        }
        auditService.record(actor, "USER_STATUS_CHANGED", "User", user.getId().toString(), "Set status to " + target);
        if (previous != target) {
            securityAlertService.alertAdministrators("Account status changed",
                    actor.getFullName() + " changed " + user.getEmail() + " from " + previous + " to " + target + ".");
        }
        return UserAdminResponse.from(user);
    }

    @Transactional
    public UserAdminResponse updateDetails(UUID userId, String fullName, String phone, User actor) {
        User user = requireUser(userId);
        requireCanManage(user, actor);
        user.setFullName(fullName.trim());
        user.setPhone(phone == null || phone.isBlank() ? null : phone.trim());
        auditService.record(actor, "USER_UPDATED", "User", user.getId().toString(), "Updated details for " + user.getEmail());
        return UserAdminResponse.from(user);
    }

    @Transactional
    public String resetPassword(UUID userId, String newPassword, User actor) {
        User user = requireUser(userId);
        requireCanManage(user, actor);
        String password = newPassword == null || newPassword.isBlank() ? TemporaryPassword.generate() : newPassword;
        if (newPassword != null && !newPassword.isBlank()) {
            passwordPolicy.validate(newPassword, user.getEmail(), user.getFullName());
        }
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
        refreshTokenRepository.findByUser_IdAndRevokedFalse(user.getId()).forEach(rt -> rt.setRevoked(true));
        auditService.record(actor, "USER_PASSWORD_RESET", "User", user.getId().toString(), "Password reset for " + user.getEmail());
        return password;
    }

    @Transactional
    public UserAdminResponse assignRoles(UUID userId, List<String> roleNames, zm.eoz.platform.identity.User actor) {
        User user = requireUser(userId);
        if (roleNames == null || roleNames.isEmpty()) {
            throw new BadRequestException("Give the account at least one role.");
        }
        if (user.getId().equals(actor.getId())) {
            throw new BadRequestException("You can't change your own roles. Ask another administrator.");
        }
        requireCanManage(user, actor);
        Set<Role> roles = roleNames.stream()
                .map(name -> roleRepository.findByName(name).orElseThrow(() -> new BadRequestException("Unknown role: " + name)))
                .collect(Collectors.toSet());
        // Both the roles being added and those being removed must be within the actor's own authority.
        Set<Role> touched = new java.util.HashSet<>(roles);
        touched.addAll(user.getRoles());
        requireCanGrant(touched, actor);
        if (isAdmin(user) && roles.stream().noneMatch(r -> "ADMIN".equals(r.getName()))) {
            requireAnotherActiveAdmin(user);
        }
        java.util.List<String> before = user.getRoles().stream().map(Role::getName).sorted().toList();
        user.setRoles(roles);
        auditService.record(actor, "USER_ROLES_CHANGED", "User", user.getId().toString(), "Set roles to " + roleNames);
        if (!before.equals(roleNames.stream().sorted().toList())) {
            securityAlertService.alertAdministrators("Privileges changed",
                    actor.getFullName() + " changed the roles of " + user.getEmail() + " from " + before + " to " + roleNames + ".");
        }
        return UserAdminResponse.from(user);
    }

    // ---------------------------------------------------------------- privilege-escalation guards

    private static boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
    }

    private static Set<String> permissionsOf(User user) {
        return user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(zm.eoz.platform.identity.Permission::getCode)
                .collect(Collectors.toSet());
    }

    /** Administrator accounts can only be changed by administrators (no taking over an admin via password reset). */
    private static void requireCanManage(User target, User actor) {
        if (isAdmin(target) && !isAdmin(actor)) {
            throw new zm.eoz.platform.common.exception.ForbiddenException(
                    "Only an administrator can change an administrator's account.");
        }
    }

    /**
     * Nobody can hand out more access than they hold: outside the ADMIN role, a role can be granted (or removed) only
     * if all of its permissions are ones the actor has, and the ADMIN role only by administrators.
     */
    private static void requireCanGrant(java.util.Collection<Role> roles, User actor) {
        if (isAdmin(actor)) return;
        Set<String> own = permissionsOf(actor);
        for (Role role : roles) {
            if ("ADMIN".equals(role.getName())) {
                throw new zm.eoz.platform.common.exception.ForbiddenException("Only an administrator can grant or remove the ADMIN role.");
            }
            java.util.List<String> beyond = role.getPermissions().stream()
                    .map(zm.eoz.platform.identity.Permission::getCode)
                    .filter(code -> !own.contains(code))
                    .sorted()
                    .toList();
            if (!beyond.isEmpty()) {
                throw new zm.eoz.platform.common.exception.ForbiddenException("You can't grant or remove the " + role.getName()
                        + " role: it includes permissions you don't have (" + String.join(", ", beyond) + ").");
            }
        }
    }

    /** The roles this person may grant or remove, by the same rule {@link #requireCanGrant} enforces. */
    @Transactional(readOnly = true)
    public java.util.List<String> grantableRoles(User actor) {
        return roleRepository.findAll().stream()
                .filter(role -> {
                    try {
                        requireCanGrant(Set.of(role), actor);
                        return true;
                    } catch (zm.eoz.platform.common.exception.ForbiddenException e) {
                        return false;
                    }
                })
                .map(Role::getName)
                .sorted()
                .toList();
    }

    /** Refuses to leave the platform without an active administrator. */
    private void requireAnotherActiveAdmin(User leaving) {
        long others = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(leaving.getId()))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .filter(AdminUserService::isAdmin)
                .count();
        if (others == 0) {
            throw new BadRequestException("This is the last active administrator. Make someone else an administrator first.");
        }
    }

    private User requireUser(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found: " + id));
    }
}
