import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { CATEGORIES, REGIONS } from "@/lib/eoz-data";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — EOZ Staff Console" },
      {
        name: "description",
        content: "Distribution reporting for EOZ: listings by category, region reach and moderation throughput.",
      },
      { property: "og:title", content: "Reports — EOZ Staff Console" },
      {
        property: "og:description",
        content: "Category mix, regional reach and review throughput across the platform.",
      },
    ],
  }),
  component: Reports,
});

const CATEGORY_MIX = [
  { name: "Jobs", pct: 38 },
  { name: "Internships", pct: 18 },
  { name: "Scholarships", pct: 16 },
  { name: "Grants", pct: 11 },
  { name: "Tenders", pct: 10 },
  { name: "Training", pct: 7 },
];

const REGION_MIX = [
  { name: "Lusaka", pct: 44 },
  { name: "Copperbelt", pct: 21 },
  { name: "Central", pct: 12 },
  { name: "Southern", pct: 9 },
  { name: "National", pct: 14 },
];

function Bars({ data }: { data: { name: string; pct: number }[] }) {
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.name}>
          <div className="mb-1 flex justify-between text-xs">
            <span>{d.name}</span>
            <span className="font-mono text-muted">{d.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-line">
            <div className="accent-gradient h-1.5 rounded-full" style={{ width: `${d.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Reports() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.4 ) — Reports"
        title="What the platform actually distributed."
        lead="Reporting covers listings published, categories represented and how quickly submissions were reviewed."
      />
      <DashNav items={ADMIN_NAV} />

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Published (30d)" value="142" />
        <StatTile label="Rejected (30d)" value="19" tone="text-rose" />
        <StatTile label="Median review" value="6h" />
        <StatTile label="Categories covered" value={String(CATEGORIES.length - 1)} />
      </div>

      <section className="grid gap-6 pb-14 lg:grid-cols-2">
        <Panel>
          <div className="label-mono mb-4">Listings by category</div>
          <Bars data={CATEGORY_MIX} />
        </Panel>
        <Panel>
          <div className="label-mono mb-4">Reach by region ({REGIONS.length} regions)</div>
          <Bars data={REGION_MIX} />
        </Panel>
      </section>
    </SiteShell>
  );
}
