import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { api, isUnauthenticated, type PageResponse } from "@/lib/api-client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Staff Console — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Operational overview for EOZ staff: moderation load, organisation verification and platform health.",
      },
      { property: "og:title", content: "Staff Console — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Moderation queue, verification backlog and audit activity for the EOZ team.",
      },
    ],
  }),
  component: AdminHome,
});

type QueueItem = { id: string; title: string; organisationName: string; status: string; flaggedDuplicateOfReference: string | null };
type AuditEvent = { id: string; actorName: string; action: string; entityType: string; occurredAt: string };
type Overview = { publishedOpportunities: number; pendingReview: number; unresolvedFraudReports: number };

function AdminHome() {
  const overviewQuery = useQuery({
    queryKey: ["admin", "reports", "overview"],
    queryFn: () => api.get<Overview>("/admin/reports/overview"),
    retry: false,
  });
  const orgsQuery = useQuery({
    queryKey: ["admin", "organisations", "count"],
    queryFn: () => api.get<PageResponse<unknown>>("/organisations", { size: 1 }),
    retry: false,
  });
  const queueQuery = useQuery({
    queryKey: ["admin", "moderation-queue", "snapshot"],
    queryFn: () => api.get<PageResponse<QueueItem>>("/opportunities/moderation/queue", { size: 5 }),
    retry: false,
  });
  const auditQuery = useQuery({
    queryKey: ["admin", "audit", "snapshot"],
    queryFn: () => api.get<PageResponse<AuditEvent>>("/admin/audit", { size: 5 }),
    retry: false,
  });

  const unauthenticated = isUnauthenticated(overviewQuery.error) || isUnauthenticated(queueQuery.error);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06 ) — Staff Console"
        title="Platform health, at a glance."
        lead="Curation quality is the product. Everything here exists to keep listings accurate, verified and current."
      />
      <DashNav items={ADMIN_NAV} />

      {unauthenticated ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a staff account to see the console overview.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pending review" value={String(overviewQuery.data?.pendingReview ?? "—")} tone="text-amber" />
        <StatTile label="Live listings" value={String(overviewQuery.data?.publishedOpportunities ?? "—")} />
        <StatTile label="Organisations" value={String(orgsQuery.data?.totalElements ?? "—")} />
        <StatTile label="Open fraud reports" value={String(overviewQuery.data?.unresolvedFraudReports ?? "—")} tone="text-rose" />
      </div>

      <section className="grid gap-6 pb-14 lg:grid-cols-2">
        <Panel>
          <div className="label-mono mb-3">Queue snapshot</div>
          {queueQuery.data?.items.length === 0 ? <p className="text-sm text-muted">Nothing waiting on review.</p> : null}
          <ul className="space-y-3 text-sm">
            {(queueQuery.data?.items ?? []).map((m) => (
              <li key={m.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <div>{m.title}</div>
                <div className="text-xs text-muted">
                  {m.organisationName} · {m.status}
                  {m.flaggedDuplicateOfReference ? ` · possible duplicate of ${m.flaggedDuplicateOfReference}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <div className="label-mono mb-3">Latest audit events</div>
          {auditQuery.data?.items.length === 0 ? <p className="text-sm text-muted">No audit events yet.</p> : null}
          <ul className="space-y-3 text-sm">
            {(auditQuery.data?.items ?? []).map((a) => (
              <li key={a.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <div className="font-mono text-xs text-accent-soft">{new Date(a.occurredAt).toLocaleString()}</div>
                <div>{a.actorName}</div>
                <div className="text-xs text-muted">
                  {a.action} · {a.entityType}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </SiteShell>
  );
}
