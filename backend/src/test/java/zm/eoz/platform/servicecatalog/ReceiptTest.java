package zm.eoz.platform.servicecatalog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/** Receipts exist only for paid invoices and only their customer (or finance staff) can see them. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReceiptTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void customerGetsAReceiptForAPaidInvoiceOnly() throws Exception {
        String email = "it-receipt-" + System.nanoTime() + "@example.zm";
        Cookie customer = register(email);
        UUID userId = jdbc.queryForObject("select id from users where email = ?", UUID.class, email);
        UUID pkg = jdbc.queryForObject("select id from service_packages where slug = 'cv-writing'", UUID.class);
        String stamp = String.valueOf(System.nanoTime()).substring(8);
        UUID order = jdbc.queryForObject(
                "insert into service_orders (reference, package_id, customer_id, status) values (?, ?, ?, 'PAID') returning id",
                UUID.class, "EOZ-SVC-IT-" + stamp, pkg, userId);
        UUID paid = jdbc.queryForObject(
                "insert into invoices (reference, order_id, amount, currency, status, issued_at, due_at, paid_at)"
                        + " values (?, ?, 450.00, 'ZMW', 'PAID', now() - interval '2 days', now() + interval '5 days', now()) returning id",
                UUID.class, "EOZ-INV-IT-" + stamp, order);
        jdbc.update("insert into payments (invoice_id, amount, method, provider_reference, status) values (?, 450.00, 'MOBILE_MONEY', 'MTN-778899', 'SUCCEEDED')",
                paid);
        UUID unpaid = jdbc.queryForObject(
                "insert into invoices (reference, order_id, amount, currency, status, issued_at, due_at)"
                        + " values (?, ?, 100.00, 'ZMW', 'UNPAID', now(), now() + interval '7 days') returning id",
                UUID.class, "EOZ-INV-IT-U" + stamp, order);

        mockMvc.perform(get("/api/v1/services/invoices/" + paid + "/receipt").cookie(customer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.receiptNumber").value("EOZ-RCT-IT-" + stamp))
                .andExpect(jsonPath("$.data.amount").value(450.00))
                .andExpect(jsonPath("$.data.lines[0].description").value("Professional CV Writing"))
                .andExpect(jsonPath("$.data.payments[0].providerReference").value("MTN-778899"))
                .andExpect(jsonPath("$.data.issuer.name").value("Echo Opportunities Zambia"));

        mockMvc.perform(get("/api/v1/services/invoices/" + unpaid + "/receipt").cookie(customer))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/services/invoices/" + paid + "/receipt").cookie(register("it-receipt-other-" + System.nanoTime() + "@example.zm")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/services/invoices/" + paid + "/receipt"))
                .andExpect(status().isUnauthorized());
    }

    private Cookie register(String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"IT Receipt\",\"email\":\"" + email
                                + "\",\"password\":\"Password123!\",\"accountType\":\"CANDIDATE\"}"))
                .andExpect(status().isOk());
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn();
        return login.getResponse().getCookie("eoz_at");
    }
}
