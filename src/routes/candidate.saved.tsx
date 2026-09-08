import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import { api, isUnauthenticated, type ApiOpportunitySummary } from "@/lib/api-client";

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
  const savedQuery = useQuery({
    queryKey: ["candidate", "saved"],
    queryFn: () => api.get<ApiOpportunitySummary[]>("/candidate/saved"),
    retry: false,
  });

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
          {isUnauthenticated(savedQuery.error) ? (
            <Panel>
              <p className="text-sm text-muted">Sign in as a candidate to see your saved opportunities.</p>
            </Panel>
          ) : null}
          {savedQuery.data?.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">Nothing saved yet — browse the board and save a listing.</p>
            </Panel>
          ) : null}
          {(savedQuery.data ?? []).map((o, i) => (
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
