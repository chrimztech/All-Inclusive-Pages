package zm.eoz.platform.admin;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

/** Irreversible deletes. Administrator-only (SYSTEM_MANAGE) and gated by an exact-match confirmation value. */
@RestController
@RequestMapping("/api/v1/admin/permanent-delete")
@PreAuthorize("hasAuthority('SYSTEM_MANAGE')")
public class AdminHardDeleteController {

    private final HardDeleteService hardDeleteService;
    private final UserRepository userRepository;

    public AdminHardDeleteController(HardDeleteService hardDeleteService, UserRepository userRepository) {
        this.hardDeleteService = hardDeleteService;
        this.userRepository = userRepository;
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable UUID id,
            @RequestParam String confirm,
            @RequestParam(defaultValue = "false") boolean includePaymentRecords) {
        hardDeleteService.deleteUser(id, confirm, includePaymentRecords, currentUser());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/organisations/{id}")
    public ResponseEntity<Void> deleteOrganisation(@PathVariable UUID id, @RequestParam String confirm) {
        hardDeleteService.deleteOrganisation(id, confirm, currentUser());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/opportunities/{id}")
    public ResponseEntity<Void> deleteOpportunity(@PathVariable UUID id, @RequestParam String confirm) {
        hardDeleteService.deleteOpportunity(id, confirm, currentUser());
        return ResponseEntity.noContent().build();
    }

    private User currentUser() {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
