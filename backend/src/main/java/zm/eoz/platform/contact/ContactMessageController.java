package zm.eoz.platform.contact;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.contact.dto.ContactMessageRequest;
import zm.eoz.platform.contact.dto.ContactMessageResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;

@RestController
public class ContactMessageController {

    private final ContactMessageService contactMessageService;
    private final UserRepository userRepository;

    public ContactMessageController(ContactMessageService contactMessageService, UserRepository userRepository) {
        this.contactMessageService = contactMessageService;
        this.userRepository = userRepository;
    }

    /** Public: anyone can send an enquiry without needing an account. */
    @PostMapping("/api/v1/contact")
    public ApiResponse<ContactMessageResponse> submit(@Valid @RequestBody ContactMessageRequest request) {
        return ApiResponse.of(contactMessageService.submit(request));
    }

    @GetMapping("/api/v1/admin/contact-messages")
    @PreAuthorize("hasAuthority('STAFF_INBOX_MANAGE')")
    public ApiResponse<PageResponse<ContactMessageResponse>> list(
            @RequestParam(required = false) String status, Pageable pageable) {
        return ApiResponse.of(PageResponse.from(contactMessageService.list(status, pageable)));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/api/v1/admin/contact-messages/{id}")
    @PreAuthorize("hasAuthority('STAFF_INBOX_MANAGE')")
    public org.springframework.http.ResponseEntity<Void> delete(@PathVariable UUID id) {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        contactMessageService.delete(id, actor);
        return org.springframework.http.ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/v1/admin/contact-messages/{id}/resolve")
    @PreAuthorize("hasAuthority('STAFF_INBOX_MANAGE')")
    public ApiResponse<ContactMessageResponse> resolve(@PathVariable UUID id) {
        var principal = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        return ApiResponse.of(contactMessageService.resolve(id, actor));
    }
}
