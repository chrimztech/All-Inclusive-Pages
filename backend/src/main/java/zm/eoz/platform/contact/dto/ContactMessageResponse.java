package zm.eoz.platform.contact.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.contact.ContactMessage;

public record ContactMessageResponse(
        UUID id,
        String name,
        String email,
        String phone,
        String reason,
        String message,
        String status,
        Instant createdAt) {

    public static ContactMessageResponse from(ContactMessage m) {
        return new ContactMessageResponse(
                m.getId(), m.getName(), m.getEmail(), m.getPhone(), m.getReason(), m.getMessage(), m.getStatus().name(), m.getCreatedAt());
    }
}
