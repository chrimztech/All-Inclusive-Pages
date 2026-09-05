import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { AUDIT_EVENTS } from "@/lib/eoz-data";

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

function Audit() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.5 ) — Audit"
        title="Append-only, by design."
        lead="Audit entries cannot be edited or deleted. Auditors have read access without any moderation rights."
      />
      <DashNav items={ADMIN_NAV} />

      <Panel className="mb-14">
        <ul className="space-y-4 text-sm">
          {AUDIT_EVENTS.map((a) => (
            <li key={a.id} className="grid gap-1 border-t border-line pt-4 first:border-0 first:pt-0 sm:grid-cols-12">
              <div className="font-mono text-xs text-accent-soft sm:col-span-3">{a.at}</div>
              <div className="sm:col-span-3">{a.actor}</div>
              <div className="text-muted sm:col-span-6">{a.action}</div>
            </li>
          ))}
        </ul>
      </Panel>
    </SiteShell>
  );
}
