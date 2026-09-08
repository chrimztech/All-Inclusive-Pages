import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, Panel, PageIntro } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import { ORG } from "@/lib/eoz-data";
import { api, type ApiApplication, type ApiOpportunitySummary, type PageResponse } from "@/lib/api-client";

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
  const opportunitiesQuery = useQuery({
    queryKey: ["opportunities", "closing-soon"],
    queryFn: () =>
      api.get<PageResponse<ApiOpportunitySummary>>("/opportunities", { deadlineWithinDays: 30, size: 3 }),
  });
  const applicationsQuery = useQuery({
    queryKey: ["candidate", "applications"],
    queryFn: () => api.get<ApiApplication[]>("/candidate/applications"),
    retry: false,
  });
  const closingSoon = opportunitiesQuery.data?.items ?? [];
  const applications = applicationsQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04 ) — Candidate Portal"
        title="Your opportunities, tracked in one place."
        lead="EOZ keeps your matches, deadlines and self-reported application progress together. Applications themselves always happen with the employer."
      />
      <DashNav items={CANDIDATE_NAV} />

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tracked applications" value={String(applications.length)} />
        <StatTile label="Closing this month" value={String(closingSoon.length)} tone="text-amber" />
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
            {applications.length === 0 ? (
              <p className="text-sm text-muted">
                No EOZ-hosted applications yet — most opportunities are applied for directly with the employer.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {applications.map((a) => (
                  <li key={a.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                    <div>{a.opportunityTitle}</div>
                    <div className="text-xs text-muted">
                      {a.status} · {a.organisationName}
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
