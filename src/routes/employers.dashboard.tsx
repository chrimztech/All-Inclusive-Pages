import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { OPPORTUNITIES } from "@/lib/eoz-data";

export const Route = createFileRoute("/employers/dashboard")({
  head: () => ({
    meta: [
      { title: "Employer Dashboard — Echo Opportunities Zambia" },
      {
        name: "description",
        content: "Monitor listing performance, review states and deadlines for your EOZ opportunities.",
      },
      { property: "og:title", content: "Employer Dashboard — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Track views, referrals and moderation status for every opportunity you publish.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const mine = OPPORTUNITIES.slice(0, 4);
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.1 ) — Dashboard"
        title="Your listings at a glance."
        lead="Performance figures are referral counts to your official channel — EOZ measures distribution, not applications."
      />
      <DashNav items={EMPLOYER_NAV} />

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Live listings" value="4" />
        <StatTile label="Views (30d)" value="9,412" />
        <StatTile label="Referrals out" value="1,208" />
        <StatTile label="Awaiting review" value="1" tone="text-amber" />
      </div>

      <section className="space-y-3 pb-14">
        {mine.map((o, i) => (
          <Panel key={o.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Chip>{o.category.replace(/s$/, "")}</Chip>
                  {i === 3 ? <Chip tone="amber">Pending review</Chip> : <Chip tone="emerald">Published</Chip>}
                </div>
                <Link
                  to="/opportunities/$opportunityId"
                  params={{ opportunityId: o.id }}
                  className="font-display text-xl tracking-tight hover:text-accent-soft"
                >
                  {o.title}
                </Link>
                <div className="mt-1 text-sm text-muted">
                  Ref {o.reference} · closes in {o.closesInDays} days
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="font-display text-lg">{1200 + i * 430}</div>
                  <div className="label-mono">Views</div>
                </div>
                <div>
                  <div className="font-display text-lg">{140 + i * 55}</div>
                  <div className="label-mono">Referrals</div>
                </div>
                <div>
                  <div className="font-display text-lg">{o.verified ? "Yes" : "No"}</div>
                  <div className="label-mono">Verified</div>
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </section>
    </SiteShell>
  );
}
