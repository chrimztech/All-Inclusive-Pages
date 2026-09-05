import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, CANDIDATE_NAV } from "@/components/eoz/DashNav";
import { CATEGORIES, REGIONS } from "@/lib/eoz-data";

const ALERTS = [
  { name: "Public health roles — Lusaka", freq: "Daily", matches: 12, on: true },
  { name: "Scholarships — any province", freq: "Weekly", matches: 4, on: true },
  { name: "ICT internships — Copperbelt", freq: "Daily", matches: 2, on: false },
];

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/50";

export const Route = createFileRoute("/candidate/alerts")({
  head: () => ({
    meta: [
      { title: "Opportunity Alerts — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Create email and SMS alerts for new verified Zambian jobs, scholarships, tenders and training that match your category and province.",
      },
      { property: "og:title", content: "Opportunity Alerts — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Set up alerts so matching opportunities reach you before the deadline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CandidateAlerts,
});

function CandidateAlerts() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04 ) — Candidate portal"
        title="Alerts"
        lead="Get told when something matching lands, so you are not refreshing the board."
      />
      <DashNav items={CANDIDATE_NAV} />

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {ALERTS.map((a) => (
            <Panel key={a.name} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-display text-lg tracking-tight">{a.name}</div>
                <div className="mt-1 text-sm text-muted">
                  {a.freq} · {a.matches} new matches this week
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Chip tone={a.on ? "emerald" : "muted"}>{a.on ? "Active" : "Paused"}</Chip>
                <button className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg">
                  {a.on ? "Pause" : "Resume"}
                </button>
              </div>
            </Panel>
          ))}
        </div>

        <Panel>
          <div className="eyebrow mb-3">New alert</div>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <label className="block text-sm">
              <span className="label-mono">Category</span>
              <select className={field}>
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label-mono">Province</span>
              <select className={field}>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label-mono">Keywords</span>
              <input className={field} placeholder="e.g. nursing, monitoring" />
            </label>
            <label className="block text-sm">
              <span className="label-mono">Frequency</span>
              <select className={field}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Instant</option>
              </select>
            </label>
            <button
              type="submit"
              className="accent-gradient w-full rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Create alert
            </button>
          </form>
        </Panel>
      </section>
    </SiteShell>
  );
}
