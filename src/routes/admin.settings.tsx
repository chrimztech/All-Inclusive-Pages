import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, ADMIN_NAV } from "@/components/eoz/DashNav";
import { CATEGORIES, ORG } from "@/lib/eoz-data";

const TOGGLES = [
  {
    t: "Require source link on every listing",
    d: "Blocks submission without an official source URL or document.",
    on: true,
  },
  {
    t: "Auto-archive at deadline",
    d: "Listings disappear from the board the morning after the closing date.",
    on: true,
  },
  {
    t: "Second reviewer for featured slots",
    d: "Featured placements need approval from a second staff member.",
    on: false,
  },
  { t: "Public report form", d: "Allows anyone to report a listing without signing in.", on: true },
];

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/50";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Platform Settings — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Staff settings for Echo Opportunities Zambia: moderation rules, categories, contact details and distribution channel configuration.",
      },
      { property: "og:title", content: "Platform Settings — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Configure moderation rules, categories and contact details for the EOZ platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06 ) — Staff console"
        title="Platform settings"
        lead="Moderation rules, taxonomy and the organisation details shown across the site."
      />
      <DashNav items={ADMIN_NAV} />

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <div className="eyebrow mb-4">Moderation rules</div>
            <div className="space-y-4">
              {TOGGLES.map((t) => (
                <div
                  key={t.t}
                  className="flex items-start justify-between gap-4 border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="text-sm text-fg">{t.t}</div>
                    <div className="mt-1 text-xs text-muted">{t.d}</div>
                  </div>
                  <Chip tone={t.on ? "emerald" : "muted"}>{t.on ? "On" : "Off"}</Chip>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="eyebrow mb-4">Organisation details</div>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
              <label className="block text-sm">
                <span className="label-mono">Public name</span>
                <input className={field} defaultValue={ORG.name} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Location</span>
                <input className={field} defaultValue={ORG.location} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Phone</span>
                <input className={field} defaultValue={ORG.phone} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Email</span>
                <input className={field} defaultValue={ORG.email} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="label-mono">Footer disclaimer</span>
                <textarea rows={3} className={field} defaultValue={ORG.disclaimer} />
              </label>
              <button
                type="submit"
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
              >
                Save changes
              </button>
            </form>
          </Panel>
        </div>

        <Panel>
          <div className="eyebrow mb-3">Categories</div>
          <ul className="space-y-2 text-sm text-muted">
            {CATEGORIES.map((category) => (
              <li
                key={category}
                className="flex items-center justify-between border-b border-line pb-2 last:border-0"
              >
                <span>{category}</span>
                <span className="font-mono text-[10px] text-muted">
                  {category.toLowerCase().replaceAll(" ", "-")}
                </span>
              </li>
            ))}
          </ul>
          <button className="mt-4 w-full rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg">
            Add category
          </button>
        </Panel>
      </section>
    </SiteShell>
  );
}
