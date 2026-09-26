package zm.eoz.platform.servicecatalog;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.common.PageResponse;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.security.UserPrincipal;
import zm.eoz.platform.servicecatalog.dto.InvoiceResponse;
import zm.eoz.platform.servicecatalog.dto.QuoteResponse;
import zm.eoz.platform.servicecatalog.dto.ServiceOrderCreateRequest;
import zm.eoz.platform.servicecatalog.dto.ServiceOrderResponse;
import zm.eoz.platform.servicecatalog.dto.ServicePackageResponse;

@RestController
public class ServiceCatalogController {

    private final ServiceCatalogService serviceCatalogService;
    private final UserRepository userRepository;

    public ServiceCatalogController(ServiceCatalogService serviceCatalogService, UserRepository userRepository) {
        this.serviceCatalogService = serviceCatalogService;
        this.userRepository = userRepository;
    }

    @GetMapping("/api/v1/services")
    public ApiResponse<List<ServicePackageResponse>> catalogue() {
        return ApiResponse.of(serviceCatalogService.catalogue());
    }

    @GetMapping("/api/v1/services/{slug}")
    public ApiResponse<ServicePackageResponse> getBySlug(@PathVariable String slug) {
        return ApiResponse.of(serviceCatalogService.getBySlug(slug));
    }

    @PostMapping("/api/v1/services/orders")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ServiceOrderResponse> createOrder(@Valid @RequestBody ServiceOrderCreateRequest request) {
        return ApiResponse.of(serviceCatalogService.createOrder(request, currentUser()));
    }

    @GetMapping("/api/v1/services/orders/mine")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<ServiceOrderResponse>> mine() {
        return ApiResponse.of(serviceCatalogService.listMine(currentUser().getId()));
    }

    @GetMapping("/api/v1/services/invoices/mine")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<InvoiceResponse>> myInvoices() {
        return ApiResponse.of(serviceCatalogService.listMyInvoices(currentUser().getId()));
    }

    @GetMapping("/api/v1/services/orders/{id}/messages")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<zm.eoz.platform.servicecatalog.dto.ServiceOrderMessageResponse>> listMessages(
            @PathVariable UUID id) {
        return ApiResponse.of(serviceCatalogService.listMessages(id, currentUser()));
    }

    @PostMapping("/api/v1/services/orders/{id}/messages")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<zm.eoz.platform.servicecatalog.dto.ServiceOrderMessageResponse> sendMessage(
            @PathVariable UUID id, @Valid @RequestBody zm.eoz.platform.servicecatalog.dto.ServiceOrderMessageRequest request) {
        return ApiResponse.of(serviceCatalogService.sendMessage(id, request, currentUser()));
    }

    @PostMapping("/api/v1/services/orders/{id}/accept-quote")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<InvoiceResponse> acceptQuote(@PathVariable UUID id) {
        return ApiResponse.of(serviceCatalogService.acceptQuoteAndInvoice(id, currentUser()));
    }

    @GetMapping("/api/v1/admin/services/orders")
    @PreAuthorize("hasAuthority('SERVICE_VIEW')")
    public ApiResponse<PageResponse<ServiceOrderResponse>> listAll(Pageable pageable) {
        return ApiResponse.of(PageResponse.from(serviceCatalogService.listAll(pageable)));
    }

    @GetMapping("/api/v1/admin/services/packages")
    @PreAuthorize("hasAuthority('SERVICE_VIEW')")
    public ApiResponse<List<zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse>> listAllPackages() {
        return ApiResponse.of(serviceCatalogService.listAllPackages());
    }

    @PostMapping("/api/v1/admin/services/packages")
    @PreAuthorize("hasAuthority('SERVICE_MANAGE')")
    public ApiResponse<zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse> createPackage(
            @Valid @RequestBody zm.eoz.platform.servicecatalog.dto.ServicePackageRequest request) {
        return ApiResponse.of(serviceCatalogService.createPackage(request, currentUser()));
    }

    @org.springframework.web.bind.annotation.PatchMapping("/api/v1/admin/services/packages/{id}")
    @PreAuthorize("hasAuthority('SERVICE_MANAGE')")
    public ApiResponse<zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse> updatePackage(
            @PathVariable UUID id, @Valid @RequestBody zm.eoz.platform.servicecatalog.dto.ServicePackageRequest request) {
        return ApiResponse.of(serviceCatalogService.updatePackage(id, request, currentUser()));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/api/v1/admin/services/packages/{id}")
    @PreAuthorize("hasAuthority('SERVICE_MANAGE')")
    public org.springframework.http.ResponseEntity<Void> removePackage(@PathVariable UUID id) {
        serviceCatalogService.deactivatePackage(id, currentUser());
        return org.springframework.http.ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/admin/services/orders/{id}/quote")
    @PreAuthorize("hasAuthority('SERVICE_MANAGE')")
    public ApiResponse<QuoteResponse> issueQuote(
            @PathVariable UUID id, @Valid @RequestBody zm.eoz.platform.servicecatalog.dto.QuoteCreateRequest request) {
        return ApiResponse.of(serviceCatalogService.issueQuote(id, request, currentUser()));
    }

    @GetMapping("/api/v1/admin/services/officers")
    @PreAuthorize("hasAuthority('SERVICE_MANAGE')")
    public ApiResponse<List<zm.eoz.platform.servicecatalog.dto.StaffOptionResponse>> searchOfficers(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String q) {
        return ApiResponse.of(serviceCatalogService.searchAssignableStaff(q));
    }

    @PostMapping("/api/v1/admin/services/orders/{id}/assign")
    @PreAuthorize("hasAuthority('SERVICE_MANAGE')")
    public ApiResponse<ServiceOrderResponse> assign(
            @PathVariable UUID id, @Valid @RequestBody zm.eoz.platform.servicecatalog.dto.AssignOfficerRequest request) {
        return ApiResponse.of(serviceCatalogService.assign(id, request.officerId(), currentUser()));
    }

    @PostMapping("/api/v1/admin/services/orders/{id}/status")
    @PreAuthorize("hasAuthority('SERVICE_MANAGE')")
    public ApiResponse<ServiceOrderResponse> changeStatus(
            @PathVariable UUID id, @Valid @RequestBody zm.eoz.platform.servicecatalog.dto.StatusChangeRequest request) {
        ServiceOrderStatus target;
        try {
            target = ServiceOrderStatus.valueOf(request.status());
        } catch (IllegalArgumentException e) {
            throw new zm.eoz.platform.common.exception.BadRequestException("Unknown status: " + request.status());
        }
        return ApiResponse.of(serviceCatalogService.transition(id, target, currentUser()));
    }

    private User currentUser() {
        var principal =
                (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findById(principal.getId()).orElseThrow();
    }
}
