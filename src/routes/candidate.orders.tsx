import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { CANDIDATE_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { PageIntro, Panel, SiteShell, Chip } from "@/components/eoz/SiteShell";
import { api, isUnauthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/candidate/orders")({
  head: () => ({
    meta: [
      { title: "Service Orders - EOZ Candidate Portal" },
      {
        name: "description",
        content: "Track career-service quotes, payments, deliverables and revisions.",
      },
    ],
  }),
  component: ServiceOrders,
});

type Order = {
  id: string;
  reference: string;
  packageName: string;
  status: string;
  assignedOfficerName: string | null;
  revisionCount: number;
  updatedAt: string;
};

const STATUS_TONE: Record<string, "emerald" | "amber" | "muted"> = {
  COMPLETED: "emerald",
  PAYMENT_PENDING: "amber",
  QUOTED: "amber",
};

function ServiceOrders() {
  const ordersQuery = useQuery({
    queryKey: ["candidate", "service-orders"],
    queryFn: () => api.get<Order[]>("/services/orders/mine"),
    retry: false,
  });
  const orders = ordersQuery.data ?? [];
  const active = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)).length;
  const awaiting = orders.filter((o) => o.status === "QUOTED" || o.status === "PAYMENT_PENDING").length;
  const completed = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.7 ) - Service orders"
        title="Support you ordered, clearly tracked."
        lead="Follow each quote, payment, assignment, deliverable and revision without mixing professional services with vacancy applications."
        aside={
          <Panel>
            <Link
              to="/services"
              className="accent-gradient inline-flex rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Browse career services
            </Link>
          </Panel>
        }
      />
      <DashNav items={CANDIDATE_NAV} />

      {isUnauthenticated(ordersQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in to see your service orders.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-3">
        <StatTile label="Active" value={String(active)} />
        <StatTile label="Awaiting you" value={String(awaiting)} tone="text-amber" />
        <StatTile label="Completed" value={String(completed)} />
      </div>
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          {orders.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">No service orders yet.</p>
            </Panel>
          ) : null}
          {orders.map((o) => (
            <Panel key={o.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-accent-soft">{o.reference}</div>
                  <h2 className="mt-1 font-display text-lg tracking-tight">{o.packageName}</h2>
                  <div className="mt-1 text-xs text-muted">
                    {o.assignedOfficerName ? `Assigned to ${o.assignedOfficerName}` : "Not yet assigned"}
                    {o.revisionCount > 0 ? ` · ${o.revisionCount} revision(s) used` : ""}
                  </div>
                </div>
                <Chip tone={STATUS_TONE[o.status] ?? "muted"}>{o.status}</Chip>
              </div>
            </Panel>
          ))}
        </div>
        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="flex gap-3">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber" />
              <p className="text-xs leading-5 text-muted">
                Ordering a CV, cover letter or coaching service does not apply for any vacancy. You
                must still use the employer's official application route.
              </p>
            </div>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
