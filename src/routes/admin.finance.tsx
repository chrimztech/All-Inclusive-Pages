import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/finance")({ head: () => ({ meta: [{ title: "Finance — EOZ Staff" }] }), component: Finance });

type InvoiceRow = {
  id: string;
  reference: string;
  orderReference: string;
  customerName: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number | null;
  lineTotal: number;
};

type FinanceSummary = { unpaidInvoices: number; paidInvoices: number };

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50";

function Finance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MOBILE_MONEY");
  const [paymentReference, setPaymentReference] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const summaryQuery = useQuery({
    queryKey: ["admin", "finance", "summary"],
    queryFn: () => api.get<FinanceSummary>("/admin/finance/summary"),
    retry: false,
  });
  const invoicesQuery = useQuery({
    queryKey: ["admin", "finance", "invoices"],
    queryFn: () => api.get<PageResponse<InvoiceRow>>("/admin/finance/invoices", { size: 50 }),
    retry: false,
  });
  const invoices = invoicesQuery.data?.items ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "finance", "invoices"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "finance", "summary"] });
  };

  const itemsQuery = useQuery({
    queryKey: ["admin", "finance", "invoice-items", expanded],
    queryFn: () => api.get<InvoiceItem[]>(`/admin/finance/invoices/${expanded}/items`),
    enabled: !!expanded,
  });

  function errorMessage(error: unknown, fallback: string) {
    return error instanceof ApiError ? error.message : fallback;
  }

  const addItem = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post(`/admin/finance/invoices/${invoiceId}/items`, {
        description: itemDescription,
        quantity: Number(itemQty),
        unitPrice: Number(itemPrice),
      }),
    onSuccess: () => {
      setItemDescription("");
      setItemQty("1");
      setItemPrice("");
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "invoice-items", expanded] });
      invalidate();
      toast("Line item added.");
    },
    onError: (error) => toast(errorMessage(error, "Could not add line item."), "error"),
  });

  const recordPayment = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post(`/admin/finance/invoices/${invoiceId}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        providerReference: paymentReference || undefined,
      }),
    onSuccess: () => {
      setPaymentAmount("");
      setPaymentReference("");
      invalidate();
      toast("Payment recorded.");
    },
    onError: (error) => toast(errorMessage(error, "Could not record payment."), "error"),
  });

  const cancelInvoice = useMutation({
    mutationFn: (invoiceId: string) => api.post(`/admin/finance/invoices/${invoiceId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "finance"] });
      toast("Invoice cancelled.");
    },
    onError: (error) => toast(errorMessage(error, "Could not cancel invoice."), "error"),
  });
  const refund = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post(`/admin/finance/invoices/${invoiceId}/refund`, {
        amount: Number(refundAmount),
        reason: refundReason,
      }),
    onSuccess: () => {
      setRefundAmount("");
      setRefundReason("");
      invalidate();
      toast("Refund issued.");
    },
    onError: (error) => toast(errorMessage(error, "Could not issue refund."), "error"),
  });

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.11 ) — Finance"
        title="A clear trail from quote to receipt."
        lead="Reconcile service payments and adjustments without exposing candidate documents or recruitment notes to finance staff."
      />
      <DashNav items={ADMIN_NAV} />
      {isUnauthenticated(summaryQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a finance, manager or admin account to view finance data.</p>
        </Panel>
      ) : null}
      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Unpaid invoices" value={String(summaryQuery.data?.unpaidInvoices ?? "—")} />
        <StatTile label="Paid invoices" value={String(summaryQuery.data?.paidInvoices ?? "—")} tone="text-accent-soft" />
      </div>
      <Panel className="mb-14">
        <div className="label-mono">Recent transactions</div>
        <div className="mt-4 space-y-3">
          {invoices.length === 0 && !invoicesQuery.isLoading ? <p className="text-sm text-muted">No invoices yet.</p> : null}
          {invoices.map((inv) => {
            const isOpen = expanded === inv.id;
            return (
              <div key={inv.id} className="border-t border-line py-4 first:border-0 first:pt-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : inv.id)}
                  className="grid w-full gap-2 text-left sm:grid-cols-[1.2fr_1.4fr_1.4fr_0.7fr_0.8fr] sm:items-center"
                >
                  <span className="font-mono text-xs text-accent-soft">{inv.reference}</span>
                  <span className="text-sm">{inv.customerName}</span>
                  <span className="text-sm text-muted">{inv.orderReference}</span>
                  <span className="font-mono text-xs">
                    {inv.currency} {inv.amount}
                  </span>
                  <Chip tone={inv.status === "PAID" ? "emerald" : inv.status === "CANCELLED" ? "rose" : "amber"}>
                    {inv.status.replace(/_/g, " ")}
                  </Chip>
                </button>

                {isOpen ? (
                  <div className="mt-4 space-y-4 rounded-md bg-surface-2 p-4">
                    <div>
                      <div className="label-mono mb-2">Line items</div>
                      <div className="space-y-1 text-xs">
                        {(itemsQuery.data ?? []).map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span>
                              {it.description} × {it.quantity}
                            </span>
                            <span className="font-mono">{it.lineTotal.toFixed(2)}</span>
                          </div>
                        ))}
                        {itemsQuery.isSuccess && (itemsQuery.data ?? []).length === 0 ? (
                          <p className="text-muted">No line items recorded.</p>
                        ) : null}
                      </div>
                      <form
                        className="mt-2 grid gap-2 sm:grid-cols-[2fr_0.7fr_1fr_auto]"
                        onSubmit={(e) => {
                          e.preventDefault();
                          addItem.mutate(inv.id);
                        }}
                      >
                        <input
                          required
                          value={itemDescription}
                          onChange={(e) => setItemDescription(e.target.value)}
                          placeholder="Description"
                          className={field}
                        />
                        <input
                          required
                          type="number"
                          min="1"
                          value={itemQty}
                          onChange={(e) => setItemQty(e.target.value)}
                          placeholder="Qty"
                          className={field}
                        />
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(e.target.value)}
                          placeholder="Unit price"
                          className={field}
                        />
                        <button
                          type="submit"
                          disabled={addItem.isPending}
                          className="rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60 sm:self-end"
                        >
                          {addItem.isPending ? "Adding…" : "Add"}
                        </button>
                      </form>
                    </div>

                    {inv.status === "UNPAID" ? (
                      <div>
                        <button
                          type="button"
                          disabled={cancelInvoice.isPending}
                          onClick={() => {
                            if (window.confirm(`Cancel invoice ${inv.reference}? The customer will be notified.`)) {
                              cancelInvoice.mutate(inv.id);
                            }
                          }}
                          className="rounded-md px-3 py-1.5 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                        >
                          Cancel invoice
                        </button>
                      </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="label-mono mb-2">Record payment</div>
                        <form
                          className="grid gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            recordPayment.mutate(inv.id);
                          }}
                        >
                          <input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="Amount"
                            className={field}
                          />
                          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={field}>
                            <option value="MOBILE_MONEY">Mobile money</option>
                            <option value="BANK_TRANSFER">Bank transfer</option>
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                          </select>
                          <input
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Provider reference (optional)"
                            className={field}
                          />
                          <button
                            type="submit"
                            disabled={recordPayment.isPending}
                            className="accent-gradient rounded-md px-4 py-2 text-xs font-medium text-ink disabled:opacity-60 justify-self-start"
                          >
                            {recordPayment.isPending ? "Recording…" : "Record payment"}
                          </button>
                        </form>
                      </div>

                      <div>
                        <div className="label-mono mb-2">Refund</div>
                        <form
                          className="grid gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            refund.mutate(inv.id);
                          }}
                        >
                          <input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            placeholder="Amount"
                            className={field}
                          />
                          <input
                            required
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="Reason"
                            className={field}
                          />
                          <button
                            type="submit"
                            disabled={refund.isPending}
                            className="rounded-md px-4 py-2 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60 justify-self-start"
                          >
                            {refund.isPending ? "Refunding…" : "Issue refund"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>
    </SiteShell>
  );
}
