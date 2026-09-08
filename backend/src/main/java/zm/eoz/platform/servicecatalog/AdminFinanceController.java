package zm.eoz.platform.servicecatalog;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;
import zm.eoz.platform.servicecatalog.dto.InvoiceItemRequest;
import zm.eoz.platform.servicecatalog.dto.InvoiceItemResponse;
import zm.eoz.platform.servicecatalog.dto.InvoiceResponse;
import zm.eoz.platform.servicecatalog.dto.PaymentRecordRequest;
import zm.eoz.platform.servicecatalog.dto.RefundRequest;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/finance")
@PreAuthorize("hasAuthority('FINANCE_MANAGE')")
public class AdminFinanceController {

    private final ServiceCatalogService serviceCatalogService;
    private final UserRepository userRepository;

    public AdminFinanceController(ServiceCatalogService serviceCatalogService, UserRepository userRepository) {
        this.serviceCatalogService = serviceCatalogService;
        this.userRepository = userRepository;
    }

    @GetMapping("/invoices")
    public ApiResponse<PageResponse<InvoiceResponse>> invoices(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(serviceCatalogService.listInvoices(pageable)));
    }

    @PostMapping("/invoices/{id}/payments")
    public ApiResponse<InvoiceResponse> recordPayment(@PathVariable UUID id, @Valid @RequestBody PaymentRecordRequest request) {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User actor = userRepository.findById(principal.getId()).orElseThrow();
        return ApiResponse.of(serviceCatalogService.recordPayment(id, request, actor));
    }

    @GetMapping("/summary")
    public ApiResponse<ServiceCatalogService.FinanceSummary> summary() {
        return ApiResponse.of(serviceCatalogService.financeSummary());
    }

    @PostMapping("/invoices/{id}/items")
    public ApiResponse<List<InvoiceItemResponse>> addItem(@PathVariable UUID id, @Valid @RequestBody InvoiceItemRequest request) {
        return ApiResponse.of(serviceCatalogService.addInvoiceItem(id, request, currentUser()));
    }

    @GetMapping("/invoices/{id}/items")
    public ApiResponse<List<InvoiceItemResponse>> listItems(@PathVariable UUID id) {
        return ApiResponse.of(serviceCatalogService.listInvoiceItems(id));
    }

    @PostMapping("/invoices/{id}/refund")
    public ApiResponse<InvoiceResponse> refund(@PathVariable UUID id, @Valid @RequestBody RefundRequest request) {
        return ApiResponse.of(serviceCatalogService.refund(id, request, currentUser()));
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
