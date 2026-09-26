import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { Download } from "lucide-react";
import { API_BASE_URL, api, isUnauthenticated, type PageResponse } from "@/lib/api-client";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — EOZ Staff Console" },
      {
        name: "description",
        content: "An append-only record of moderation decisions, role changes and automated platform actions.",
      },
      { property: "og:title", content: "Audit Log — EOZ Staff Console" },
      {
        property: "og:description",
        content: "Every approval, rejection and role change recorded with actor and timestamp.",
      },
    ],
  }),
  component: Audit,
});

type AuditEvent = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  occurredAt: string;
};

function Audit() {
  const auditQuery = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => api.get<PageResponse<AuditEvent>>("/admin/audit", { size: 50 }),
    retry: false,
  });
  const events = auditQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.5 ) — Audit"
        title="Append-only, by design."
        lead="Audit entries cannot be edited or deleted. Auditors have read access without any moderation rights."
        aside={
          <a
            href={`${API_BASE_URL}/admin/audit/export.csv`}
            className="press accent-gradient inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm text-ink"
          >
            <Download aria-hidden="true" className="size-4" />
            Export CSV
          </a>
        }
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(auditQuery.error) ? (
        <Panel className="mb-4">
          <p className="text-sm text-muted">Sign in with an admin or auditor account to view the audit log.</p>
        </Panel>
      ) : null}

      <Panel className="mb-14">
        {events.length === 0 ? <p className="text-sm text-muted">No audit events yet.</p> : null}
        <ul className="space-y-4 text-sm">
          {events.map((e) => (
            <li key={e.id} className="grid gap-1 border-t border-line pt-4 first:border-0 first:pt-0 sm:grid-cols-12">
              <div className="font-mono text-xs text-accent-soft sm:col-span-3">
                {new Date(e.occurredAt).toLocaleString()}
              </div>
              <div className="sm:col-span-3">{e.actorName}</div>
              <div className="text-muted sm:col-span-6">
                {e.action} · {e.entityType}
                {e.summary ? ` — ${e.summary}` : ""}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </SiteShell>
  );
}
