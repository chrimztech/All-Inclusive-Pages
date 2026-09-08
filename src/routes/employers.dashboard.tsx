import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { api, daysUntil, isUnauthenticated, type PageResponse } from "@/lib/api-client";

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
        content: "Track views, saves and moderation status for every opportunity you publish.",
      },
    ],
  }),
  component: Dashboard,
});

type EmployerOpportunity = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  categoryName: string;
  status: string;
  verified: boolean;
  viewsCount: number;
  savesCount: number;
  deadline: string | null;
};

type Stats = { published: number; pendingReview: number; drafts: number; closed: number };

function Dashboard() {
  const listingsQuery = useQuery({
    queryKey: ["employer", "opportunities", "mine"],
    queryFn: () => api.get<PageResponse<EmployerOpportunity>>("/opportunities/mine", { size: 4 }),
    retry: false,
  });
  const statsQuery = useQuery({
    queryKey: ["employer", "opportunities", "mine", "stats"],
    queryFn: () => api.get<Stats>("/opportunities/mine/stats"),
    retry: false,
  });

  const mine = listingsQuery.data?.items ?? [];
  const stats = statsQuery.data;
  const totalViews = mine.reduce((sum, o) => sum + o.viewsCount, 0);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.1 ) — Dashboard"
        title="Your listings at a glance."
        lead="EOZ measures distribution — views and saves on the board. Applications go straight to your official channel."
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(listingsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as an employer to see your dashboard.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Live listings" value={String(stats?.published ?? "—")} />
        <StatTile label="Views (recent listings)" value={String(totalViews)} />
        <StatTile label="Drafts" value={String(stats?.drafts ?? "—")} />
        <StatTile label="Awaiting review" value={String(stats?.pendingReview ?? "—")} tone="text-amber" />
      </div>

      <section className="space-y-3 pb-14">
        {listingsQuery.isLoading ? (
          <Panel className="py-10 text-center text-sm text-muted">Loading your listings…</Panel>
        ) : mine.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-muted">
            You haven't submitted any opportunities yet.{" "}
            <Link to="/employers/post" className="text-accent-soft">
              Post your first listing →
            </Link>
          </Panel>
        ) : (
          mine.map((o) => {
            const closesIn = daysUntil(o.deadline);
            return (
              <Panel key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Chip>{o.categoryName}</Chip>
                      <Chip tone={o.status === "PUBLISHED" ? "emerald" : "amber"}>
                        {o.status.replace(/_/g, " ")}
                      </Chip>
                    </div>
                    {o.status === "PUBLISHED" ? (
                      <Link
                        to="/opportunities/$opportunityId"
                        params={{ opportunityId: o.slug }}
                        className="font-display text-xl tracking-tight hover:text-accent-soft"
                      >
                        {o.title}
                      </Link>
                    ) : (
                      <span className="font-display text-xl tracking-tight">{o.title}</span>
                    )}
                    <div className="mt-1 text-sm text-muted">
                      Ref {o.reference}
                      {closesIn !== null ? ` · closes in ${closesIn} days` : ""}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="font-display text-lg">{o.viewsCount}</div>
                      <div className="label-mono">Views</div>
                    </div>
                    <div>
                      <div className="font-display text-lg">{o.savesCount}</div>
                      <div className="label-mono">Saves</div>
                    </div>
                    <div>
                      <div className="font-display text-lg">{o.verified ? "Yes" : "No"}</div>
                      <div className="label-mono">Verified</div>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })
        )}
      </section>
    </SiteShell>
  );
}
