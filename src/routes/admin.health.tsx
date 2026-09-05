import { createFileRoute } from "@tanstack/react-router";
import { Activity, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/admin/health")({
  head: () => ({
    meta: [{ title: "System Health - EOZ Staff" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: SystemHealth,
});

const SERVICES = [
  { name: "Public website & API", status: "Operational", latency: "184 ms", checked: "30 sec ago" },
  { name: "PostgreSQL database", status: "Operational", latency: "22 ms", checked: "30 sec ago" },
  { name: "File storage", status: "Operational", latency: "96 ms", checked: "1 min ago" },
  { name: "Email delivery", status: "Degraded", latency: "4 retries", checked: "2 min ago" },
  { name: "Background jobs", status: "Operational", latency: "12 queued", checked: "30 sec ago" },
];

function SystemHealth() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.13 ) - System health"
        title="Safe operational signals, no secrets."
        lead="Monitor availability, queues, delivery and scheduled work without exposing credentials, customer content or raw stack traces."
        aside={
          <Panel>
            <div className="flex items-center gap-3">
              <Activity aria-hidden="true" className="size-5 text-accent-soft" />
              <div>
                <Chip tone="amber">Minor degradation</Chip>
                <p className="mt-2 text-xs text-muted">
                  Core browsing and account services are available.
                </p>
              </div>
            </div>
          </Panel>
        }
      />
      <DashNav items={ADMIN_NAV} />
      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Availability (30d)" value="99.96%" />
        <StatTile label="API p95" value="384 ms" />
        <StatTile label="Queued jobs" value="12" />
        <StatTile label="Failed deliveries" value="4" tone="text-amber" />
      </div>
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <div className="label-mono mb-4">Service checks</div>
          <div className="space-y-1">
            {SERVICES.map((service) => (
              <div
                key={service.name}
                className="grid gap-2 border-t border-line py-4 first:border-0 first:pt-0 sm:grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr] sm:items-center"
              >
                <span className="flex items-center gap-2 text-sm">
                  {service.status === "Operational" ? (
                    <CheckCircle2 aria-hidden="true" className="size-4 text-emerald" />
                  ) : (
                    <TriangleAlert aria-hidden="true" className="size-4 text-amber" />
                  )}
                  {service.name}
                </span>
                <Chip tone={service.status === "Operational" ? "emerald" : "amber"}>
                  {service.status}
                </Chip>
                <span className="font-mono text-xs text-muted">{service.latency}</span>
                <span className="text-xs text-muted">{service.checked}</span>
              </div>
            ))}
          </div>
        </Panel>
        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4 text-accent-soft" />
              <div className="label-mono">Scheduled jobs</div>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between">
                <span>Close expired listings</span>
                <span className="text-muted">00:05</span>
              </li>
              <li className="flex justify-between">
                <span>Daily alert digest</span>
                <span className="text-muted">06:00</span>
              </li>
              <li className="flex justify-between">
                <span>Publish scheduled content</span>
                <span className="text-muted">Every 5m</span>
              </li>
            </ul>
          </Panel>
          <Panel>
            <div className="label-mono">Recovery posture</div>
            <p className="mt-2 text-sm text-muted">Last backup: today, 02:00 CAT</p>
            <p className="mt-1 text-sm text-muted">Last restore test: 28 Aug 2026</p>
            <p className="mt-3 text-xs leading-5 text-muted">
              Detailed diagnostics are restricted to authorised administrators and never include raw
              secrets.
            </p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
