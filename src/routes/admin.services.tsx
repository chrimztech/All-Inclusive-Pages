import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/services")({ head: () => ({ meta: [{ title: "Service Operations — EOZ Staff" }] }), component: Services });

type ServiceOrderRow = {
  id: string;
  reference: string;
  packageName: string;
  customerName: string;
  status: string;
  assignedOfficerName: string | null;
  revisionCount: number;
  updatedAt: string;
};

type UserOption = { id: string; fullName: string; email: string; roles: string[] };

const STATUSES = [
  "ENQUIRY",
  "REQUIREMENTS_RECEIVED",
  "QUOTED",
  "ACCEPTED",
  "PAYMENT_PENDING",
  "PAID",
  "ASSIGNED",
  "IN_PROGRESS",
  "REVIEW",
  "REVISION",
  "COMPLETED",
  "CANCELLED",
];

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50";

function Services() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [officerSearch, setOfficerSearch] = useState("");
  const [statusTarget, setStatusTarget] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["admin", "service-orders"],
    queryFn: () => api.get<PageResponse<ServiceOrderRow>>("/admin/services/orders", { size: 50 }),
    retry: false,
  });
  const orders = ordersQuery.data?.items ?? [];
  const openCount = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)).length;
  const paymentPending = orders.filter((o) => o.status === "PAYMENT_PENDING").length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "service-orders"] });

  const officersQuery = useQuery({
    queryKey: ["admin", "service-officer-search", officerSearch],
    queryFn: () => api.get<UserOption[]>("/admin/services/officers", { q: officerSearch }),
    enabled: officerSearch.length > 1,
  });

  function errorMessage(error: unknown, fallback: string) {
    return error instanceof ApiError ? error.message : fallback;
  }

  const issueQuote = useMutation({
    mutationFn: (orderId: string) => api.post(`/admin/services/orders/${orderId}/quote`, { amount: Number(quoteAmount) }),
    onSuccess: () => {
      setQuoteAmount("");
      invalidate();
      toast("Quote issued.");
    },
    onError: (error) => toast(errorMessage(error, "Could not issue quote."), "error"),
  });

  const assignOfficer = useMutation({
    mutationFn: ({ orderId, officerId }: { orderId: string; officerId: string }) =>
      api.post(`/admin/services/orders/${orderId}/assign`, { officerId }),
    onSuccess: () => {
      setOfficerSearch("");
      invalidate();
      toast("Officer assigned.");
    },
    onError: (error) => toast(errorMessage(error, "Could not assign officer."), "error"),
  });

  const changeStatus = useMutation({
    mutationFn: (orderId: string) => api.post(`/admin/services/orders/${orderId}/status`, { status: statusTarget }),
    onSuccess: () => {
      invalidate();
      toast("Status updated.");
    },
    onError: (error) => toast(errorMessage(error, "Could not change status."), "error"),
  });

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.8 ) — Services"
        title="Keep every deliverable moving."
        lead="Assign work, watch due dates and keep quotes, revisions and customer review in one operational view."
      />
      <DashNav items={ADMIN_NAV} />
      {isUnauthenticated(ordersQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a service, manager or admin account to view orders.</p>
        </Panel>
      ) : null}
      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open orders" value={String(openCount)} />
        <StatTile label="Payment pending" value={String(paymentPending)} tone="text-amber" />
      </div>
      <section className="grid gap-4 pb-14 md:grid-cols-2">
        {orders.length === 0 && !ordersQuery.isLoading ? (
          <Panel>
            <p className="text-sm text-muted">No service orders yet.</p>
          </Panel>
        ) : null}
        {orders.map((o) => {
          const isOpen = expanded === o.id;
          return (
            <Panel key={o.id}>
              <div className="flex justify-between gap-3">
                <span className="font-mono text-xs text-accent-soft">{o.reference}</span>
                <Chip tone={o.status === "PAYMENT_PENDING" ? "amber" : o.status === "COMPLETED" ? "emerald" : "muted"}>
                  {o.status.replace(/_/g, " ")}
                </Chip>
              </div>
              <h2 className="mt-3 font-display text-xl">{o.packageName}</h2>
              <div className="mt-1 text-sm text-muted">{o.customerName}</div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span>Assigned: {o.assignedOfficerName ?? "Unassigned"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(isOpen ? null : o.id);
                    setStatusTarget(o.status);
                  }}
                  className="text-accent-soft hover:text-fg"
                >
                  {isOpen ? "Close" : "Manage →"}
                </button>
              </div>

              {isOpen ? (
                <div className="mt-4 space-y-4 border-t border-line pt-4">
                  <div>
                    <div className="label-mono mb-2">Issue quote</div>
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        issueQuote.mutate(o.id);
                      }}
                    >
                      <input
                        required
                        type="number"
                        min="1"
                        step="0.01"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        placeholder="Amount (ZMW)"
                        className={field}
                      />
                      <button
                        type="submit"
                        disabled={issueQuote.isPending}
                        className="accent-gradient shrink-0 self-end rounded-md px-4 py-2 text-xs font-medium text-ink disabled:opacity-60"
                      >
                        {issueQuote.isPending ? "Issuing…" : "Issue"}
                      </button>
                    </form>
                  </div>

                  <div>
                    <div className="label-mono mb-2">Assign officer</div>
                    <input
                      value={officerSearch}
                      onChange={(e) => setOfficerSearch(e.target.value)}
                      placeholder="Search staff by name or email"
                      className={field}
                    />
                    {officerSearch.length > 1 ? (
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-md bg-surface-2 ring-1 ring-line">
                        {(officersQuery.data ?? []).map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => assignOfficer.mutate({ orderId: o.id, officerId: u.id })}
                            disabled={assignOfficer.isPending}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-ink disabled:opacity-60"
                          >
                            {u.fullName} <span className="text-muted">({u.roles.join(", ")})</span>
                          </button>
                        ))}
                        {officersQuery.isSuccess && (officersQuery.data ?? []).length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted">No matches.</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="label-mono mb-2">Change status</div>
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        changeStatus.mutate(o.id);
                      }}
                    >
                      <select value={statusTarget} onChange={(e) => setStatusTarget(e.target.value)} className={field}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={changeStatus.isPending}
                        className="accent-gradient shrink-0 self-end rounded-md px-4 py-2 text-xs font-medium text-ink disabled:opacity-60"
                      >
                        {changeStatus.isPending ? "Saving…" : "Apply"}
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </Panel>
          );
        })}
      </section>
    </SiteShell>
  );
}
