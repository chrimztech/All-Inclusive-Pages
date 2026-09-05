import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, Panel, PageIntro } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import { APPLICATIONS, OPPORTUNITIES, ORG } from "@/lib/eoz-data";

export const Route = createFileRoute("/candidate/")({
  head: () => ({
    meta: [
      { title: "Candidate Portal — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Track opportunities, saved listings and your application progress across Zambia in the EOZ candidate portal.",
      },
      { property: "og:title", content: "Candidate Portal — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Your personal view of matched opportunities, deadlines and application tracking.",
      },
    ],
  }),
  component: CandidateHome,
});

function CandidateHome() {
  const closingSoon = [...OPPORTUNITIES].sort((a, b) => a.closesInDays - b.closesInDays).slice(0, 3);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04 ) — Candidate Portal"
        title="Your opportunities, tracked in one place."
        lead="EOZ keeps your matches, deadlines and self-reported application progress together. Applications themselves always happen with the employer."
      />
      <DashNav items={CANDIDATE_NAV} />

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Matched" value="24" />
        <StatTile label="Saved" value="6" />
        <StatTile label="Tracked applications" value={String(APPLICATIONS.length)} />
        <StatTile label="Closing this week" value="3" tone="text-amber" />
      </div>

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          <h2 className="font-display text-2xl tracking-tight">Closing soonest</h2>
          {closingSoon.map((o, i) => (
            <OpportunityCard key={o.id} item={o} delay={i * 60} />
          ))}
          <Link to="/opportunities" className="inline-block pt-2 text-sm text-accent-soft">
            Browse the full board →
          </Link>
        </div>
        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono mb-3">Recent activity</div>
            <ul className="space-y-3 text-sm">
              {APPLICATIONS.map((a) => (
                <li key={a.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div>{a.role}</div>
                  <div className="text-xs text-muted">
                    {a.status} · {a.updated}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <div className="label-mono mb-2">How applications work</div>
            <p className="text-xs text-muted">{ORG.disclaimer}</p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
