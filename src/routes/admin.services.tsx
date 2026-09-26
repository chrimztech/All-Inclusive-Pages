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

type ServicePackageRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  turnaround: string | null;
  includes: string[];
  active: boolean;
};

type PackageFormState = {
  slug: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  turnaround: string;
  includes: string;
  active: boolean;
};

const EMPTY_PACKAGE_FORM: PackageFormState = {
  slug: "",
  name: "",
  description: "",
  price: "",
  currency: "ZMW",
  turnaround: "",
  includes: "",
  active: true,
};

function packageFormFromRow(row: ServicePackageRow): PackageFormState {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    price: String(row.price),
    currency: row.currency,
    turnaround: row.turnaround ?? "",
    includes: row.includes.join("\n"),
    active: row.active,
  };
}

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

  const [addingPackage, setAddingPackage] = useState(false);
  const [newPackage, setNewPackage] = useState<PackageFormState>(EMPTY_PACKAGE_FORM);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editPackage, setEditPackage] = useState<PackageFormState>(EMPTY_PACKAGE_FORM);

  const packagesQuery = useQuery({
    queryKey: ["admin", "service-packages"],
    queryFn: () => api.get<ServicePackageRow[]>("/admin/services/packages"),
    retry: false,
  });
  const packages = packagesQuery.data ?? [];
  const invalidatePackages = () => queryClient.invalidateQueries({ queryKey: ["admin", "service-packages"] });

  function toPackageBody(form: PackageFormState) {
    return {
      slug: form.slug.trim(),
      name: form.name.trim(),
      description: form.description || undefined,
      price: Number(form.price),
      currency: form.currency || undefined,
      turnaround: form.turnaround || undefined,
      includes: form.includes
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      active: form.active,
    };
  }

  const createPackage = useMutation({
    mutationFn: () => api.post("/admin/services/packages", toPackageBody(newPackage)),
    onSuccess: () => {
      setNewPackage(EMPTY_PACKAGE_FORM);
      setAddingPackage(false);
      invalidatePackages();
      toast("Service added to the catalogue.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not add the service.", "error"),
  });

  const updatePackageMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/services/packages/${id}`, toPackageBody(editPackage)),
    onSuccess: () => {
      setEditingPackageId(null);
      invalidatePackages();
      toast("Service updated.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update the service.", "error"),
  });

  const removePackage = useMutation({
    mutationFn: (id: string) => api.del(`/admin/services/packages/${id}`),
    onSuccess: () => {
      invalidatePackages();
      toast("Service removed from the catalogue.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not remove the service.", "error"),
  });

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
      <Panel className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label-mono">Catalogue</div>
            <h2 className="mt-1 font-display text-2xl">Services on offer</h2>
          </div>
          {!addingPackage ? (
            <button
              type="button"
              onClick={() => {
                setAddingPackage(true);
                setEditingPackageId(null);
              }}
              className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              + Add service
            </button>
          ) : null}
        </div>

        {addingPackage ? (
          <form
            className="mt-4 grid gap-3 border-b border-line pb-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createPackage.mutate();
            }}
          >
            <label>
              <span className="label-mono">Slug (URL-safe, unique)</span>
              <input
                required
                value={newPackage.slug}
                onChange={(e) => setNewPackage((p) => ({ ...p, slug: e.target.value }))}
                placeholder="e.g. cv-writing"
                className={field}
              />
            </label>
            <label>
              <span className="label-mono">Name</span>
              <input
                required
                value={newPackage.name}
                onChange={(e) => setNewPackage((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Professional CV Writing"
                className={field}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="label-mono">Description</span>
              <textarea
                rows={2}
                value={newPackage.description}
                onChange={(e) => setNewPackage((p) => ({ ...p, description: e.target.value }))}
                className={field}
              />
            </label>
            <label>
              <span className="label-mono">Price</span>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={newPackage.price}
                onChange={(e) => setNewPackage((p) => ({ ...p, price: e.target.value }))}
                className={field}
              />
            </label>
            <label>
              <span className="label-mono">Turnaround</span>
              <input
                value={newPackage.turnaround}
                onChange={(e) => setNewPackage((p) => ({ ...p, turnaround: e.target.value }))}
                placeholder="e.g. 3 working days"
                className={field}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="label-mono">What&apos;s included (one per line)</span>
              <textarea
                rows={3}
                value={newPackage.includes}
                onChange={(e) => setNewPackage((p) => ({ ...p, includes: e.target.value }))}
                className={field}
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={createPackage.isPending}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {createPackage.isPending ? "Adding…" : "Add service"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingPackage(false);
                  setNewPackage(EMPTY_PACKAGE_FORM);
                }}
                className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-4 divide-y divide-line">
          {packagesQuery.isLoading ? <p className="py-4 text-sm text-muted">Loading…</p> : null}
          {packagesQuery.isSuccess && packages.length === 0 ? (
            <p className="py-4 text-sm text-muted">No services in the catalogue yet.</p>
          ) : null}
          {packages.map((p) => {
            const isEditing = editingPackageId === p.id;
            return (
              <div key={p.id} className="py-4 first:pt-0">
                {isEditing ? (
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updatePackageMutation.mutate(p.id);
                    }}
                  >
                    <label>
                      <span className="label-mono">Slug</span>
                      <input
                        required
                        value={editPackage.slug}
                        onChange={(e) => setEditPackage((f) => ({ ...f, slug: e.target.value }))}
                        className={field}
                      />
                    </label>
                    <label>
                      <span className="label-mono">Name</span>
                      <input
                        required
                        value={editPackage.name}
                        onChange={(e) => setEditPackage((f) => ({ ...f, name: e.target.value }))}
                        className={field}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="label-mono">Description</span>
                      <textarea
                        rows={2}
                        value={editPackage.description}
                        onChange={(e) => setEditPackage((f) => ({ ...f, description: e.target.value }))}
                        className={field}
                      />
                    </label>
                    <label>
                      <span className="label-mono">Price</span>
                      <input
                        required
                        type="number"
                        min="1"
                        step="0.01"
                        value={editPackage.price}
                        onChange={(e) => setEditPackage((f) => ({ ...f, price: e.target.value }))}
                        className={field}
                      />
                    </label>
                    <label>
                      <span className="label-mono">Turnaround</span>
                      <input
                        value={editPackage.turnaround}
                        onChange={(e) => setEditPackage((f) => ({ ...f, turnaround: e.target.value }))}
                        className={field}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="label-mono">What&apos;s included (one per line)</span>
                      <textarea
                        rows={3}
                        value={editPackage.includes}
                        onChange={(e) => setEditPackage((f) => ({ ...f, includes: e.target.value }))}
                        className={field}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={editPackage.active}
                        onChange={(e) => setEditPackage((f) => ({ ...f, active: e.target.checked }))}
                        className="size-3.5"
                      />
                      Listed in the public catalogue
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="submit"
                        disabled={updatePackageMutation.isPending}
                        className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                      >
                        {updatePackageMutation.isPending ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPackageId(null)}
                        className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        {!p.active ? <Chip tone="muted">Removed</Chip> : null}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {p.currency} {p.price.toLocaleString()} · {p.turnaround ?? "No turnaround set"} · /{p.slug}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPackageId(p.id);
                          setEditPackage(packageFormFromRow(p));
                          setAddingPackage(false);
                        }}
                        className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg"
                      >
                        Edit
                      </button>
                      {p.active ? (
                        <button
                          type="button"
                          disabled={removePackage.isPending}
                          onClick={() => {
                            if (window.confirm(`Remove "${p.name}" from the catalogue? Existing orders are unaffected.`)) {
                              removePackage.mutate(p.id);
                            }
                          }}
                          className="rounded-md px-3 py-1.5 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

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
