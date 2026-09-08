package zm.eoz.platform.servicecatalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "invoice_items")
@Getter
@Setter
@NoArgsConstructor
public class InvoiceItem {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "tax_rate", nullable = false)
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public BigDecimal lineTotal() {
        BigDecimal base = unitPrice.multiply(BigDecimal.valueOf(quantity));
        return base.add(base.multiply(taxRate));
    }
}
