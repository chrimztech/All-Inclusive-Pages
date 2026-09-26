package zm.eoz.platform.servicecatalog;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import zm.eoz.platform.audit.AuditService;
import zm.eoz.platform.common.ReferenceNumberService;
import zm.eoz.platform.common.exception.BadRequestException;
import zm.eoz.platform.common.exception.ConflictException;
import zm.eoz.platform.common.exception.ForbiddenException;
import zm.eoz.platform.common.exception.NotFoundException;
import zm.eoz.platform.identity.User;
import zm.eoz.platform.identity.UserRepository;
import zm.eoz.platform.notification.NotificationService;
import zm.eoz.platform.servicecatalog.dto.InvoiceItemRequest;
import zm.eoz.platform.servicecatalog.dto.InvoiceItemResponse;
import zm.eoz.platform.servicecatalog.dto.InvoiceResponse;
import zm.eoz.platform.servicecatalog.dto.PaymentRecordRequest;
import zm.eoz.platform.servicecatalog.dto.QuoteCreateRequest;
import zm.eoz.platform.servicecatalog.dto.QuoteResponse;
import zm.eoz.platform.servicecatalog.dto.RefundRequest;
import zm.eoz.platform.servicecatalog.dto.ServiceOrderCreateRequest;
import zm.eoz.platform.servicecatalog.dto.ServiceOrderMessageRequest;
import zm.eoz.platform.servicecatalog.dto.ServiceOrderMessageResponse;
import zm.eoz.platform.servicecatalog.dto.ServiceOrderResponse;
import zm.eoz.platform.servicecatalog.dto.ServicePackageResponse;

@Service
public class ServiceCatalogService {

    private static final Map<ServiceOrderStatus, Set<ServiceOrderStatus>> ALLOWED_TRANSITIONS = Map.of(
            ServiceOrderStatus.ENQUIRY, Set.of(ServiceOrderStatus.REQUIREMENTS_RECEIVED, ServiceOrderStatus.CANCELLED),
            ServiceOrderStatus.REQUIREMENTS_RECEIVED, Set.of(ServiceOrderStatus.QUOTED, ServiceOrderStatus.CANCELLED),
            ServiceOrderStatus.QUOTED, Set.of(ServiceOrderStatus.ACCEPTED, ServiceOrderStatus.CANCELLED),
            ServiceOrderStatus.ACCEPTED, Set.of(ServiceOrderStatus.PAYMENT_PENDING, ServiceOrderStatus.CANCELLED),
            ServiceOrderStatus.PAYMENT_PENDING, Set.of(ServiceOrderStatus.PAID, ServiceOrderStatus.CANCELLED),
            ServiceOrderStatus.PAID, Set.of(ServiceOrderStatus.ASSIGNED),
            ServiceOrderStatus.ASSIGNED, Set.of(ServiceOrderStatus.IN_PROGRESS),
            ServiceOrderStatus.IN_PROGRESS, Set.of(ServiceOrderStatus.REVIEW),
            ServiceOrderStatus.REVIEW, Set.of(ServiceOrderStatus.REVISION, ServiceOrderStatus.COMPLETED),
            ServiceOrderStatus.REVISION, Set.of(ServiceOrderStatus.IN_PROGRESS, ServiceOrderStatus.REVIEW));

    private final ServicePackageRepository packageRepository;
    private final ServiceOrderRepository orderRepository;
    private final QuoteRepository quoteRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final PaymentRepository paymentRepository;
    private final ServiceOrderMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ReferenceNumberService referenceNumberService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public ServiceCatalogService(
            ServicePackageRepository packageRepository,
            ServiceOrderRepository orderRepository,
            QuoteRepository quoteRepository,
            InvoiceRepository invoiceRepository,
            InvoiceItemRepository invoiceItemRepository,
            PaymentRepository paymentRepository,
            ServiceOrderMessageRepository messageRepository,
            UserRepository userRepository,
            ReferenceNumberService referenceNumberService,
            AuditService auditService,
            NotificationService notificationService) {
        this.packageRepository = packageRepository;
        this.orderRepository = orderRepository;
        this.quoteRepository = quoteRepository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.paymentRepository = paymentRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.referenceNumberService = referenceNumberService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<ServicePackageResponse> catalogue() {
        return packageRepository.findByActiveTrue().stream().map(ServicePackageResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ServicePackageResponse getBySlug(String slug) {
        return ServicePackageResponse.from(packageRepository
                .findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException("Service not found: " + slug)));
    }

    @Transactional(readOnly = true)
    public List<zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse> listAllPackages() {
        return packageRepository.findAll().stream()
                .map(zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse::from)
                .toList();
    }

    @Transactional
    public zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse createPackage(
            zm.eoz.platform.servicecatalog.dto.ServicePackageRequest request, User actor) {
        if (packageRepository.findBySlugAndActiveTrue(request.slug()).isPresent()) {
            throw new ConflictException("A service with slug \"" + request.slug() + "\" already exists.");
        }
        ServicePackage pkg = new ServicePackage();
        applyPackageFields(pkg, request);
        pkg = packageRepository.save(pkg);
        auditService.record(actor, "SERVICE_PACKAGE_CREATED", "ServicePackage", pkg.getSlug(), "Created \"" + pkg.getName() + "\"");
        return zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse.from(pkg);
    }

    @Transactional
    public zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse updatePackage(
            UUID id, zm.eoz.platform.servicecatalog.dto.ServicePackageRequest request, User actor) {
        ServicePackage pkg = requirePackage(id);
        applyPackageFields(pkg, request);
        pkg.setUpdatedAt(Instant.now());
        packageRepository.save(pkg);
        auditService.record(actor, "SERVICE_PACKAGE_UPDATED", "ServicePackage", pkg.getSlug(), "Updated \"" + pkg.getName() + "\"");
        return zm.eoz.platform.servicecatalog.dto.ServicePackageAdminResponse.from(pkg);
    }

    @Transactional
    public void deactivatePackage(UUID id, User actor) {
        ServicePackage pkg = requirePackage(id);
        pkg.setActive(false);
        pkg.setUpdatedAt(Instant.now());
        packageRepository.save(pkg);
        auditService.record(actor, "SERVICE_PACKAGE_REMOVED", "ServicePackage", pkg.getSlug(), "Removed \"" + pkg.getName() + "\" from the catalogue");
    }

    private void applyPackageFields(ServicePackage pkg, zm.eoz.platform.servicecatalog.dto.ServicePackageRequest request) {
        pkg.setSlug(request.slug());
        pkg.setName(request.name());
        pkg.setDescription(request.description());
        pkg.setPrice(request.price());
        if (request.currency() != null && !request.currency().isBlank()) {
            pkg.setCurrency(request.currency());
        }
        pkg.setTurnaround(request.turnaround());
        pkg.setIncludes(request.includes() == null ? null : String.join("; ", request.includes()));
        if (request.active() != null) {
            pkg.setActive(request.active());
        }
    }

    private ServicePackage requirePackage(UUID id) {
        return packageRepository.findById(id).orElseThrow(() -> new NotFoundException("Service package not found: " + id));
    }

    @Transactional
    public ServiceOrderResponse createOrder(ServiceOrderCreateRequest request, User customer) {
        ServicePackage pkg = packageRepository
                .findBySlugAndActiveTrue(request.slug())
                .orElseThrow(() -> new NotFoundException("Service not found: " + request.slug()));

        ServiceOrder order = new ServiceOrder();
        order.setReference(referenceNumberService.next("EOZ-SVC"));
        order.setServicePackage(pkg);
        order.setCustomer(customer);
        order.setRequirements(request.requirements());
        if (request.requirements() != null && !request.requirements().isBlank()) {
            order.setStatus(ServiceOrderStatus.REQUIREMENTS_RECEIVED);
        }
        order = orderRepository.save(order);
        auditService.record(
                customer, "ORDER_CREATED", "ServiceOrder", order.getReference(), "Ordered \"" + pkg.getName() + "\"");
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public List<ServiceOrderResponse> listMine(UUID customerId) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::toResponse)
                .toList();
    }

    private ServiceOrderResponse toResponse(ServiceOrder order) {
        Quote latest = quoteRepository.findByOrderIdOrderByIssuedAtDesc(order.getId()).stream()
                .findFirst()
                .orElse(null);
        return ServiceOrderResponse.from(order, latest);
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> listMyInvoices(UUID customerId) {
        return invoiceRepository.findByOrder_CustomerIdOrderByIssuedAtDesc(customerId).stream()
                .map(InvoiceResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceOrderMessageResponse> listMessages(UUID orderId, User actor) {
        ServiceOrder order = requireOrder(orderId);
        requireOrderAccess(order, actor);
        return messageRepository.findByOrderIdOrderBySentAtAsc(orderId).stream()
                .map(ServiceOrderMessageResponse::from)
                .toList();
    }

    @Transactional
    public ServiceOrderMessageResponse sendMessage(UUID orderId, ServiceOrderMessageRequest request, User actor) {
        ServiceOrder order = requireOrder(orderId);
        requireOrderAccess(order, actor);

        ServiceOrderMessage message = new ServiceOrderMessage();
        message.setOrder(order);
        message.setSender(actor);
        message.setMessage(request.message());
        message = messageRepository.save(message);

        User notifyTarget = order.getCustomer().getId().equals(actor.getId())
                ? order.getAssignedOfficer()
                : order.getCustomer();
        if (notifyTarget != null) {
            notificationService.notify(
                    notifyTarget,
                    "SERVICE_ORDER_MESSAGE",
                    "New message on " + order.getReference(),
                    request.message().length() > 140 ? request.message().substring(0, 140) + "…" : request.message());
        }
        return ServiceOrderMessageResponse.from(message);
    }

    private void requireOrderAccess(ServiceOrder order, User actor) {
        if (!order.getCustomer().getId().equals(actor.getId()) && !hasStaffRole(actor)) {
            throw new ForbiddenException("Only the customer or staff can access this order's messages.");
        }
    }

    @Transactional(readOnly = true)
    public Page<ServiceOrderResponse> listAll(Pageable pageable) {
        return orderRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toResponse);
    }

    @Transactional
    public ServiceOrderResponse assign(UUID orderId, UUID officerId, User actor) {
        ServiceOrder order = requireOrder(orderId);
        if (order.getStatus() != ServiceOrderStatus.PAID) {
            throw new BadRequestException("Only a paid order can be assigned.");
        }
        User officer = userRepository.findById(officerId).orElseThrow(() -> new NotFoundException("Officer not found: " + officerId));
        order.setAssignedOfficer(officer);
        order.setStatus(ServiceOrderStatus.ASSIGNED);
        auditService.record(actor, "ORDER_ASSIGNED", "ServiceOrder", order.getReference(), "Assigned to " + officer.getFullName());
        return toResponse(order);
    }

    @Transactional
    public ServiceOrderResponse transition(UUID orderId, ServiceOrderStatus target, User actor) {
        ServiceOrder order = requireOrder(orderId);
        Set<ServiceOrderStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(order.getStatus(), Set.of());
        if (!allowed.contains(target)) {
            throw new BadRequestException("Cannot move order from " + order.getStatus() + " to " + target + ".");
        }
        if (target == ServiceOrderStatus.REVISION) {
            order.setRevisionCount(order.getRevisionCount() + 1);
        }
        order.setStatus(target);
        auditService.record(actor, "ORDER_STATUS_CHANGED", "ServiceOrder", order.getReference(), "Moved to " + target);
        return toResponse(order);
    }

    @Transactional
    public QuoteResponse issueQuote(UUID orderId, QuoteCreateRequest request, User actor) {
        ServiceOrder order = requireOrder(orderId);
        if (order.getStatus() != ServiceOrderStatus.REQUIREMENTS_RECEIVED && order.getStatus() != ServiceOrderStatus.ENQUIRY) {
            throw new BadRequestException("A quote can only be issued from ENQUIRY or REQUIREMENTS_RECEIVED.");
        }
        Quote quote = new Quote();
        quote.setOrder(order);
        quote.setAmount(request.amount());
        quote = quoteRepository.save(quote);
        order.setStatus(ServiceOrderStatus.QUOTED);
        auditService.record(actor, "QUOTE_ISSUED", "ServiceOrder", order.getReference(), "Quoted " + request.amount());
        notificationService.notify(
                order.getCustomer(),
                "SERVICE_QUOTE_ISSUED",
                "You have a new quote",
                "Your order " + order.getReference() + " (" + order.getServicePackage().getName() + ") has been quoted at "
                        + request.amount() + " " + order.getServicePackage().getCurrency() + ".");
        return QuoteResponse.from(quote);
    }

    /** The customer's rating of a completed order. Given once; the officer and managers see it. */
    @Transactional
    public ServiceOrderResponse submitFeedback(UUID orderId, int rating, String comment, User actor) {
        ServiceOrder order = requireOrder(orderId);
        if (!order.getCustomer().getId().equals(actor.getId())) {
            throw new ForbiddenException("Only the customer can rate this order.");
        }
        if (order.getStatus() != ServiceOrderStatus.COMPLETED) {
            throw new BadRequestException("You can rate an order once it is completed.");
        }
        if (order.getRating() != null) {
            throw new BadRequestException("This order has already been rated.");
        }
        if (rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5.");
        }
        order.setRating((short) rating);
        order.setFeedback(comment == null || comment.isBlank() ? null : comment.trim());
        order.setRatedAt(Instant.now());
        auditService.record(actor, "SERVICE_ORDER_RATED", "ServiceOrder", order.getReference(), "Rated " + rating + "/5");
        List<Quote> quotes = quoteRepository.findByOrderIdOrderByIssuedAtDesc(orderId);
        return ServiceOrderResponse.from(order, quotes.isEmpty() ? null : quotes.get(0));
    }

    @Transactional
    public InvoiceResponse acceptQuoteAndInvoice(UUID orderId, User actor) {
        ServiceOrder order = requireOrder(orderId);
        if (order.getStatus() != ServiceOrderStatus.QUOTED) {
            throw new BadRequestException("Only a quoted order can be accepted.");
        }
        if (!order.getCustomer().getId().equals(actor.getId()) && !hasStaffRole(actor)) {
            throw new ForbiddenException("Only the customer or staff can accept this quote.");
        }
        List<Quote> quotes = quoteRepository.findByOrderIdOrderByIssuedAtDesc(orderId);
        Quote latest = quotes.isEmpty() ? null : quotes.get(0);
        if (latest == null) {
            throw new BadRequestException("No quote to accept.");
        }
        latest.setAcceptedAt(Instant.now());

        Invoice invoice = new Invoice();
        invoice.setReference(referenceNumberService.next("EOZ-INV"));
        invoice.setOrder(order);
        invoice.setAmount(latest.getAmount());
        invoice.setDueAt(Instant.now().plusSeconds(7 * 24 * 3600));
        invoice = invoiceRepository.save(invoice);

        order.setStatus(ServiceOrderStatus.PAYMENT_PENDING);
        auditService.record(actor, "QUOTE_ACCEPTED", "ServiceOrder", order.getReference(), "Invoice " + invoice.getReference() + " raised");
        return InvoiceResponse.from(invoice);
    }

    @Transactional
    public InvoiceResponse recordPayment(UUID invoiceId, PaymentRecordRequest request, User actor) {
        Invoice invoice =
                invoiceRepository.findById(invoiceId).orElseThrow(() -> new NotFoundException("Invoice not found: " + invoiceId));
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("This invoice is already marked paid.");
        }

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(request.amount());
        payment.setMethod(request.method());
        payment.setProviderReference(request.providerReference());
        payment.setStatus(Payment.Status.SUCCEEDED);
        payment.setRecordedBy(actor);
        paymentRepository.save(payment);

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(Instant.now());

        ServiceOrder order = invoice.getOrder();
        if (order.getStatus() == ServiceOrderStatus.PAYMENT_PENDING) {
            order.setStatus(ServiceOrderStatus.PAID);
        }
        auditService.record(
                actor, "PAYMENT_RECORDED", "Invoice", invoice.getReference(), "Recorded " + request.amount() + " via " + request.method());
        notificationService.notify(
                order.getCustomer(),
                "PAYMENT_RECEIVED",
                "Payment received",
                "We've received your payment for invoice " + invoice.getReference() + ". Your order will now be assigned.");
        return InvoiceResponse.from(invoice);
    }

    /**
     * Applies a payment reported by a provider webhook. Unlike {@link #recordPayment}, there is
     * no authenticated actor — the caller (PaymentWebhookService) has already verified the
     * request's signature and idempotency before this runs.
     */
    @Transactional
    public void recordPaymentFromWebhook(String invoiceReference, java.math.BigDecimal amount, String provider, String providerReference) {
        Invoice invoice = invoiceRepository
                .findByReference(invoiceReference)
                .orElseThrow(() -> new NotFoundException("Invoice not found: " + invoiceReference));
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            return;
        }

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(amount);
        payment.setMethod(provider);
        payment.setProviderReference(providerReference);
        payment.setStatus(Payment.Status.SUCCEEDED);
        paymentRepository.save(payment);

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(Instant.now());

        ServiceOrder order = invoice.getOrder();
        if (order.getStatus() == ServiceOrderStatus.PAYMENT_PENDING) {
            order.setStatus(ServiceOrderStatus.PAID);
        }
        auditService.record(
                null, "PAYMENT_WEBHOOK_RECEIVED", "Invoice", invoice.getReference(), "Webhook payment via " + provider);
        notificationService.notify(
                order.getCustomer(),
                "PAYMENT_RECEIVED",
                "Payment received",
                "We've received your payment for invoice " + invoice.getReference() + ". Your order will now be assigned.");
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> listInvoices(Pageable pageable) {
        return invoiceRepository.findAllByOrderByIssuedAtDesc(pageable).map(InvoiceResponse::from);
    }

    private static final Set<String> ASSIGNABLE_STAFF_ROLES = Set.of("SERVICE_OFFICER", "MANAGER", "ADMIN");

    @Transactional(readOnly = true)
    public List<zm.eoz.platform.servicecatalog.dto.StaffOptionResponse> searchAssignableStaff(String query) {
        String q = query == null ? "" : query;
        return userRepository.findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                        q, q, org.springframework.data.domain.PageRequest.of(0, 10))
                .stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> ASSIGNABLE_STAFF_ROLES.contains(r.getName())))
                .map(zm.eoz.platform.servicecatalog.dto.StaffOptionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public FinanceSummary financeSummary() {
        return new FinanceSummary(invoiceRepository.countByStatus(InvoiceStatus.UNPAID), invoiceRepository.countByStatus(InvoiceStatus.PAID));
    }

    public record FinanceSummary(long unpaidInvoices, long paidInvoices) {}

    private boolean hasStaffRole(User user) {
        return user.getRoles().stream()
                .anyMatch(r -> Set.of("SERVICE_OFFICER", "FINANCE_OFFICER", "MANAGER", "ADMIN").contains(r.getName()));
    }

    private ServiceOrder requireOrder(UUID id) {
        return orderRepository.findById(id).orElseThrow(() -> new NotFoundException("Service order not found: " + id));
    }

    @Transactional
    public List<InvoiceItemResponse> addInvoiceItem(UUID invoiceId, InvoiceItemRequest request, User actor) {
        Invoice invoice = requireInvoice(invoiceId);
        InvoiceItem item = new InvoiceItem();
        item.setInvoice(invoice);
        item.setDescription(request.description());
        item.setQuantity(request.quantity() <= 0 ? 1 : request.quantity());
        item.setUnitPrice(request.unitPrice());
        if (request.taxRate() != null) {
            item.setTaxRate(request.taxRate());
        }
        invoiceItemRepository.save(item);
        recomputeInvoiceTotal(invoice);
        auditService.record(actor, "INVOICE_ITEM_ADDED", "Invoice", invoice.getReference(), request.description());
        return listInvoiceItems(invoiceId);
    }

    @Transactional(readOnly = true)
    public List<InvoiceItemResponse> listInvoiceItems(UUID invoiceId) {
        return invoiceItemRepository.findByInvoiceIdOrderByCreatedAtAsc(invoiceId).stream()
                .map(InvoiceItemResponse::from)
                .toList();
    }

    private void recomputeInvoiceTotal(Invoice invoice) {
        java.math.BigDecimal total = invoiceItemRepository.findByInvoiceIdOrderByCreatedAtAsc(invoice.getId()).stream()
                .map(InvoiceItem::lineTotal)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        if (total.compareTo(java.math.BigDecimal.ZERO) > 0) {
            invoice.setAmount(total);
        }
    }

    /**
     * Records a refund/adjustment against a paid invoice. Requires an authenticated actor and a
     * reason (enforced at the DTO level) — every financial adjustment must be explainable and
     * traceable per the platform's auditability rule.
     */
    @Transactional
    public InvoiceResponse cancelInvoice(UUID invoiceId, User actor) {
        Invoice invoice = requireInvoice(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.UNPAID) {
            throw new BadRequestException("Only an unpaid invoice can be cancelled; use a refund for paid invoices.");
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        auditService.record(actor, "INVOICE_CANCELLED", "Invoice", invoice.getReference(), "Cancelled unpaid invoice");
        notificationService.notify(
                invoice.getOrder().getCustomer(),
                "INVOICE_CANCELLED",
                "An invoice was cancelled",
                "Invoice " + invoice.getReference() + " has been cancelled. You do not need to pay it.");
        return InvoiceResponse.from(invoice);
    }

    @Transactional
    public InvoiceResponse refund(UUID invoiceId, RefundRequest request, User actor) {
        Invoice invoice = requireInvoice(invoiceId);
        if (invoice.getStatus() != InvoiceStatus.PAID && invoice.getStatus() != InvoiceStatus.PARTIALLY_REFUNDED) {
            throw new BadRequestException("Only a paid invoice can be refunded.");
        }
        if (request.amount().compareTo(invoice.getAmount()) > 0) {
            throw new BadRequestException("Refund amount cannot exceed the invoice amount.");
        }

        Payment refund = new Payment();
        refund.setInvoice(invoice);
        refund.setAmount(request.amount());
        refund.setMethod("REFUND");
        refund.setReason(request.reason());
        refund.setRecordedBy(actor);
        boolean isFullRefund = request.amount().compareTo(invoice.getAmount()) == 0;
        refund.setStatus(isFullRefund ? Payment.Status.REFUNDED : Payment.Status.PARTIALLY_REFUNDED);
        paymentRepository.save(refund);

        invoice.setStatus(isFullRefund ? InvoiceStatus.REFUNDED : InvoiceStatus.PARTIALLY_REFUNDED);

        auditService.record(
                actor, "INVOICE_REFUNDED", "Invoice", invoice.getReference(),
                "Refunded " + request.amount() + " — reason: " + request.reason());
        notificationService.notify(
                invoice.getOrder().getCustomer(),
                "REFUND_ISSUED",
                "A refund has been issued",
                "A refund of " + request.amount() + " " + invoice.getCurrency() + " was issued for invoice "
                        + invoice.getReference() + ".");
        return InvoiceResponse.from(invoice);
    }

    private Invoice requireInvoice(UUID id) {
        return invoiceRepository.findById(id).orElseThrow(() -> new NotFoundException("Invoice not found: " + id));
    }
}
