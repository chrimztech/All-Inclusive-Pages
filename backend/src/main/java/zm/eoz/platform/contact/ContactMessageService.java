package zm.eoz.platform.contact;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.contact.dto.ContactMessageRequest;
import zm.eoz.platform.contact.dto.ContactMessageResponse;
import zm.eoz.platform.identity.User;

@Service
public class ContactMessageService {

    private final ContactMessageRepository contactMessageRepository;
    private final AuditService auditService;

    public ContactMessageService(ContactMessageRepository contactMessageRepository, AuditService auditService) {
        this.contactMessageRepository = contactMessageRepository;
        this.auditService = auditService;
    }

    @Transactional
    public ContactMessageResponse submit(ContactMessageRequest request) {
        ContactMessage entity = new ContactMessage();
        entity.setName(request.name());
        entity.setEmail(request.email());
        entity.setPhone(request.phone());
        entity.setReason(request.reason());
        entity.setMessage(request.message());
        entity = contactMessageRepository.save(entity);
        auditService.record(
                null, "CONTACT_MESSAGE_SUBMITTED", "ContactMessage", entity.getId().toString(), "From " + request.email());
        return ContactMessageResponse.from(entity);
    }

    @Transactional(readOnly = true)
    public Page<ContactMessageResponse> list(String status, Pageable pageable) {
        Page<ContactMessage> page = (status == null || status.isBlank())
                ? contactMessageRepository.findAllByOrderByCreatedAtDesc(pageable)
                : contactMessageRepository.findByStatusOrderByCreatedAtDesc(parseStatus(status), pageable);
        return page.map(ContactMessageResponse::from);
    }

    @Transactional
    public ContactMessageResponse resolve(UUID id, User actor) {
        ContactMessage entity = contactMessageRepository
                .findById(id)
                .orElseThrow(() -> new NotFoundException("Contact message not found: " + id));
        entity.setStatus(ContactMessage.Status.RESOLVED);
        entity.setResolvedBy(actor);
        entity.setResolvedAt(java.time.Instant.now());
        auditService.record(actor, "CONTACT_MESSAGE_RESOLVED", "ContactMessage", id.toString(), "Marked resolved");
        return ContactMessageResponse.from(entity);
    }

    private ContactMessage.Status parseStatus(String status) {
        try {
            return ContactMessage.Status.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown status: " + status);
        }
    }
}
