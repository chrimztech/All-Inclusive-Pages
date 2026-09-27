import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { api, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { ADMIN_SECTIONS, allows } from "@/lib/access";
import { useCan, useCurrentUser } from "@/lib/use-current-user";

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

type QueueItem = {
  id: string;
  title: string;
  organisationName: string;
  status: string;
  flaggedDuplicateOfReference: string | null;
};
type AuditEvent = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  occurredAt: string;
};
type Overview = {
  publishedOpportunities: number;
  pendingReview: number;
  unresolvedFraudReports: number;
};

/** One line on what each console section is for, shown in "Your sections". */
const SECTION_HINTS: Record<string, string> = {
  "/admin/opportunities": "Every listing, its lifecycle and history",
  "/admin/moderation": "Review submissions and fraud reports",
  "/admin/organisations": "Verify employers and their evidence",
  "/admin/recruitment": "Recruitment projects, pipelines and scorecards",
  "/admin/services": "Service orders, quotes and the catalogue",
  "/admin/content": "Channel posts and the content calendar",
  "/admin/finance": "Invoices, payments and refunds",
  "/admin/applications": "EOZ-hosted applications across listings",
  "/admin/inbox": "Messages from the contact form",
  "/admin/notifications": "Staff notices and email delivery",
  "/admin/notification-templates": "Wording of every email",
  "/admin/categories": "Opportunity categories",
  "/admin/testimonials": "Quotes shown on the home page",
  "/admin/reports": "Defined metrics and snapshots",
  "/admin/exports": "CSV exports of what your role can see",
  "/admin/users": "Accounts, roles and access",
  "/admin/permissions": "What each role can do",
  "/admin/settings": "Organisation details and feature flags",
  "/admin/audit": "Who did what, and when",
  "/admin/privacy": "Deletion requests and retention",
  "/admin/health": "Backups, restores and system status",
};

function AdminHome() {
  const can = useCan();
  const { user } = useCurrentUser();
  const canReports = can("REPORTS_VIEW");
  const canModerate = can("OPPORTUNITY_MODERATE");
  const canAudit = can("AUDIT_READ");
  const mySections = ADMIN_SECTIONS.filter((s) => s.to !== "/admin" && allows(s.rule, user));
  const overviewQuery = useQuery({
    queryKey: ["admin", "reports", "overview"],
    queryFn: () => api.get<Overview>("/admin/reports/overview"),
    retry: false,
    enabled: canReports,
  });
  const orgsQuery = useQuery({
    queryKey: ["admin", "organisations", "count"],
    queryFn: () => api.get<PageResponse<unknown>>("/organisations", { size: 1 }),
    retry: false,
    enabled: canReports,
  });
  const queueQuery = useQuery({
    queryKey: ["admin", "moderation-queue", "snapshot"],
    queryFn: () => api.get<PageResponse<QueueItem>>("/opportunities/moderation/queue", { size: 5 }),
    retry: false,
    enabled: canModerate,
  });
  const auditQuery = useQuery({
    queryKey: ["admin", "audit", "snapshot"],
    queryFn: () => api.get<PageResponse<AuditEvent>>("/admin/audit", { size: 5 }),
    retry: false,
    enabled: canAudit,
  });

  const unauthenticated =
    isUnauthenticated(overviewQuery.error) || isUnauthenticated(queueQuery.error);

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
          <p className="text-sm text-muted">
            Sign in with a staff account to see the console overview.
          </p>
        </Panel>
      ) : null}

      {canReports ? (
        <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Pending review"
            value={String(overviewQuery.data?.pendingReview ?? "—")}
            tone="text-amber"
          />
          <StatTile
            label="Live listings"
            value={String(overviewQuery.data?.publishedOpportunities ?? "—")}
          />
          <StatTile label="Organisations" value={String(orgsQuery.data?.totalElements ?? "—")} />
          <StatTile
            label="Open fraud reports"
            value={String(overviewQuery.data?.unresolvedFraudReports ?? "—")}
            tone="text-rose"
          />
        </div>
      ) : null}

      <Panel className="mb-6">
        <div className="label-mono mb-3">Your sections</div>
        {mySections.length === 0 ? (
          <p className="text-sm text-muted">
            Your role has no console sections yet. Ask an administrator for the permissions you
            need.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {mySections.map((section) => (
              <li key={section.to}>
                <Link
                  to={section.to}
                  className="block rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-line transition-colors hover:bg-white/[0.06] hover:ring-accent/30"
                >
                  <span className="text-sm font-medium">{section.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {SECTION_HINTS[section.to] ?? ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <section className="grid gap-6 pb-14 lg:grid-cols-2">
        {canModerate ? (
          <Panel>
            <div className="label-mono mb-3">Queue snapshot</div>
            {queueQuery.data?.items.length === 0 ? (
              <p className="text-sm text-muted">Nothing waiting on review.</p>
            ) : null}
            <ul className="space-y-3 text-sm">
              {(queueQuery.data?.items ?? []).map((m) => (
                <li key={m.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div>{m.title}</div>
                  <div className="text-xs text-muted">
                    {m.organisationName} · {m.status}
                    {m.flaggedDuplicateOfReference
                      ? ` · possible duplicate of ${m.flaggedDuplicateOfReference}`
                      : ""}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
        {canAudit ? (
          <Panel>
            <div className="label-mono mb-3">Latest audit events</div>
            {auditQuery.data?.items.length === 0 ? (
              <p className="text-sm text-muted">No audit events yet.</p>
            ) : null}
            <ul className="space-y-3 text-sm">
              {(auditQuery.data?.items ?? []).map((a) => (
                <li key={a.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="font-mono text-xs text-accent-soft">
                    {new Date(a.occurredAt).toLocaleString()}
                  </div>
                  <div>{a.actorName}</div>
                  <div className="text-xs text-muted">
                    {a.action} · {a.entityType}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </section>
    </SiteShell>
  );
}
