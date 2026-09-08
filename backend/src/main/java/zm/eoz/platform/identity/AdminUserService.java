package zm.eoz.platform.identity;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.dto.UserAdminResponse;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;

    public AdminUserService(UserRepository userRepository, RoleRepository roleRepository, AuditService auditService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditService = auditService;
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
