import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { AUDIT_EVENTS, MODERATION_QUEUE } from "@/lib/eoz-data";

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

function AdminHome() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06 ) — Staff Console"
        title="Platform health, at a glance."
        lead="Curation quality is the product. Everything here exists to keep listings accurate, verified and current."
      />
      <DashNav items={ADMIN_NAV} />

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pending review" value="2" tone="text-amber" />
        <StatTile label="Live listings" value="86" />
        <StatTile label="Organisations" value="120" />
        <StatTile label="Expired today" value="6" />
      </div>

      <section className="grid gap-6 pb-14 lg:grid-cols-2">
        <Panel>
          <div className="label-mono mb-3">Queue snapshot</div>
          <ul className="space-y-3 text-sm">
            {MODERATION_QUEUE.map((m) => (
              <li key={m.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <div>{m.title}</div>
                <div className="text-xs text-muted">
                  {m.organisation} · {m.state} · {m.flag}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <div className="label-mono mb-3">Latest audit events</div>
          <ul className="space-y-3 text-sm">
            {AUDIT_EVENTS.map((a) => (
              <li key={a.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <div className="font-mono text-xs text-accent-soft">{a.at}</div>
                <div>{a.actor}</div>
                <div className="text-xs text-muted">{a.action}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </SiteShell>
  );
}
