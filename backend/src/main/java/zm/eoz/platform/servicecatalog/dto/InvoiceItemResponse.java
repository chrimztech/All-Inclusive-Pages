package zm.eoz.platform.servicecatalog.dto;

import java.math.BigDecimal;
import java.util.UUID;
import zm.eoz.platform.servicecatalog.InvoiceItem;

public record InvoiceItemResponse(UUID id, String description, int quantity, BigDecimal unitPrice, BigDecimal taxRate, BigDecimal lineTotal) {
    public static InvoiceItemResponse from(InvoiceItem i) {
        return new InvoiceItemResponse(i.getId(), i.getDescription(), i.getQuantity(), i.getUnitPrice(), i.getTaxRate(), i.lineTotal());
    }
}
