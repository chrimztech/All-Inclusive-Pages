import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import { OPPORTUNITIES } from "@/lib/eoz-data";

export const Route = createFileRoute("/candidate/saved")({
  head: () => ({
    meta: [
      { title: "Saved Opportunities — EOZ Candidate Portal" },
      {
        name: "description",
        content: "Your shortlist of jobs, scholarships, grants and training saved for later action.",
      },
      { property: "og:title", content: "Saved Opportunities — EOZ Candidate Portal" },
      {
        property: "og:description",
        content: "Keep a shortlist of Zambian opportunities and act before the deadline.",
      },
    ],
  }),
  component: Saved,
});

function Saved() {
  const saved = OPPORTUNITIES.slice(0, 4);
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.2 ) — Saved"
        title="Your shortlist."
        lead="Saved listings stay here until they close. Deadlines are recalculated every day."
      />
      <DashNav items={CANDIDATE_NAV} />
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          {saved.map((o, i) => (
            <OpportunityCard key={o.id} item={o} delay={i * 60} />
          ))}
        </div>
        <aside className="lg:col-span-4">
          <Panel>
            <div className="label-mono mb-2">Deadline alerts</div>
            <p className="text-sm text-muted">
              Saved items closing within three days are highlighted in red across the portal.
            </p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
