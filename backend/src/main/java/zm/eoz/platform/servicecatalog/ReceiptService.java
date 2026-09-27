package zm.eoz.platform.servicecatalog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ForbiddenException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;

/**
 * Receipts for paid invoices: everything a printable receipt needs in one read. The receipt number is derived
 * from the invoice reference (EOZ-INV-2026-000012 → EOZ-RCT-2026-000012), so it is stable and collision-free.
 */
@Service
public class ReceiptService {

    public record Line(String description, int quantity, BigDecimal unitPrice, BigDecimal taxRate, BigDecimal total) {}

    public record PaymentLine(Instant receivedAt, String method, String providerReference, BigDecimal amount, String status) {}

    public record Issuer(String name, String location, String phone, String email) {}

    public record Receipt(
            String receiptNumber,
            String invoiceReference,
            String orderReference,
            String serviceName,
            String customerName,
            String customerEmail,
            String currency,
            BigDecimal amount,
            String invoiceStatus,
            Instant issuedAt,
            Instant paidAt,
            List<Line> lines,
            List<PaymentLine> payments,
            Issuer issuer) {}

    private final JdbcTemplate jdbc;

    public ReceiptService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Receipt get(UUID invoiceId, User requester) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "select i.reference, i.amount, i.currency, i.status, i.issued_at, i.paid_at, o.reference order_ref,"
                        + " o.customer_id, p.name package_name, u.full_name, u.email"
                        + " from invoices i join service_orders o on o.id = i.order_id"
                        + " join service_packages p on p.id = o.package_id join users u on u.id = o.customer_id"
                        + " where i.id = ?",
                invoiceId);
        if (rows.isEmpty()) throw new NotFoundException("Invoice not found.");
        Map<String, Object> r = rows.get(0);
        boolean customer = requester.getId().equals(r.get("customer_id"));
        boolean finance = requester.getRoles().stream().flatMap(role -> role.getPermissions().stream())
                .anyMatch(p -> "FINANCE_MANAGE".equals(p.getCode()));
        if (!customer && !finance) throw new ForbiddenException("You do not have access to this receipt.");
        if (r.get("paid_at") == null) {
            throw new BadRequestException("This invoice hasn't been paid yet, so there is no receipt.");
        }

        List<Line> lines = jdbc.query(
                "select description, quantity, unit_price, coalesce(tax_rate, 0) tax_rate from invoice_items"
                        + " where invoice_id = ? order by created_at",
                (rs, i) -> {
                    BigDecimal unit = rs.getBigDecimal("unit_price");
                    BigDecimal tax = rs.getBigDecimal("tax_rate");
                    int qty = rs.getInt("quantity");
                    BigDecimal net = unit.multiply(BigDecimal.valueOf(qty));
                    BigDecimal total = net.add(net.multiply(tax).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP));
                    return new Line(rs.getString("description"), qty, unit, tax, total);
                },
                invoiceId);
        if (lines.isEmpty()) {
            // Invoices created from a single quote have no itemised lines; show the service as one line.
            BigDecimal amount = (BigDecimal) r.get("amount");
            lines = List.of(new Line((String) r.get("package_name"), 1, amount, BigDecimal.ZERO, amount));
        }
        List<PaymentLine> payments = jdbc.query(
                "select created_at, method, provider_reference, amount, status from payments where invoice_id = ? order by created_at",
                (rs, i) -> new PaymentLine(rs.getTimestamp(1).toInstant(), rs.getString(2), rs.getString(3),
                        rs.getBigDecimal(4), rs.getString(5)),
                invoiceId);

        Map<String, String> settings = new HashMap<>();
        jdbc.query("select key, value from system_settings where key like 'org.%'",
                rs -> {
                    settings.put(rs.getString(1), rs.getString(2));
                });
        String invoiceRef = (String) r.get("reference");
        return new Receipt(
                invoiceRef.replace("-INV-", "-RCT-"),
                invoiceRef,
                (String) r.get("order_ref"),
                (String) r.get("package_name"),
                (String) r.get("full_name"),
                (String) r.get("email"),
                (String) r.get("currency"),
                (BigDecimal) r.get("amount"),
                (String) r.get("status"),
                ((java.sql.Timestamp) r.get("issued_at")).toInstant(),
                ((java.sql.Timestamp) r.get("paid_at")).toInstant(),
                lines,
                payments,
                new Issuer(
                        settings.getOrDefault("org.name", "Echo Opportunities Zambia"),
                        settings.getOrDefault("org.location", "Lusaka, Zambia"),
                        settings.get("org.phone"),
                        settings.get("org.email")));
    }
}
