package zm.eoz.platform.servicecatalog.dto;

import java.time.Instant;
import java.util.UUID;
import zm.eoz.platform.servicecatalog.ServiceOrderMessage;

public record ServiceOrderMessageResponse(
        UUID id, UUID senderId, String senderName, boolean fromCustomer, String message, Instant sentAt) {

    public static ServiceOrderMessageResponse from(ServiceOrderMessage m) {
        boolean fromCustomer = m.getSender().getId().equals(m.getOrder().getCustomer().getId());
        return new ServiceOrderMessageResponse(
                m.getId(), m.getSender().getId(), m.getSender().getFullName(), fromCustomer, m.getMessage(), m.getSentAt());
    }
}
