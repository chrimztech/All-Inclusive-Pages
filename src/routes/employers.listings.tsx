import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, daysUntil, isUnauthenticated, type PageResponse } from "@/lib/api-client";

export const Route = createFileRoute("/employers/listings")({
  head: () => ({
    meta: [
      { title: "Opportunity Listings - EOZ Employer Portal" },
      {
        name: "description",
        content: "Draft, submit, renew and review your organisation's EOZ opportunities.",
      },
    ],
  }),
  component: EmployerListings,
});

type EmployerOpportunity = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  categoryName: string;
  organisationName: string;
  region: string | null;
  workMode: string | null;
  status: string;
  verified: boolean;
  viewsCount: number;
  savesCount: number;
  deadline: string | null;
  publishedAt: string | null;
  createdAt: string;
};

type Stats = { published: number; pendingReview: number; drafts: number; closed: number };

const STATUS_TONE: Record<string, "emerald" | "amber" | "muted" | "rose"> = {
  PUBLISHED: "emerald",
  PENDING_REVIEW: "amber",
  APPROVED: "amber",
  SCHEDULED: "amber",
  DRAFT: "muted",
  CLOSED: "rose",
  EXPIRED: "rose",
  ARCHIVED: "muted",
};

function EmployerListings() {
  const listingsQuery = useQuery({
    queryKey: ["employer", "opportunities", "mine"],
    queryFn: () => api.get<PageResponse<EmployerOpportunity>>("/opportunities/mine", { size: 50 }),
    retry: false,
  });
  const statsQuery = useQuery({
    queryKey: ["employer", "opportunities", "mine", "stats"],
    queryFn: () => api.get<Stats>("/opportunities/mine/stats"),
    retry: false,
  });

  const listings = listingsQuery.data?.items ?? [];
  const stats = statsQuery.data;

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.3 ) - Listings"
        title="Every opportunity, from draft to archive."
        lead="See exactly where each listing sits, keep the employer-approved application route current and renew closed opportunities safely."
        aside={
          <Panel>
            <Link
              to="/employers/post"
              className="accent-gradient inline-flex rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Create opportunity
            </Link>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(listingsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as an employer to see your listings.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Published" value={String(stats?.published ?? "—")} />
        <StatTile label="Pending review" value={String(stats?.pendingReview ?? "—")} tone="text-amber" />
        <StatTile label="Drafts" value={String(stats?.drafts ?? "—")} />
        <StatTile label="Closed" value={String(stats?.closed ?? "—")} />
      </div>

      <div className="space-y-3 pb-14">
        {listingsQuery.isLoading ? (
          <Panel className="py-10 text-center text-sm text-muted">Loading your listings…</Panel>
        ) : listings.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-muted">
            You haven't submitted any opportunities yet.
          </Panel>
        ) : (
          listings.map((o) => {
            const closesIn = daysUntil(o.deadline);
            return (
              <Panel key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Chip tone={STATUS_TONE[o.status] ?? "muted"}>{o.status.replace(/_/g, " ")}</Chip>
                      <span className="font-mono text-[10px] text-muted">{o.reference}</span>
                    </div>
                    <h2 className="font-display text-xl tracking-tight">{o.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {o.categoryName} · {o.region ?? "National"} {o.workMode ? `· ${o.workMode}` : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                      <span>{closesIn !== null ? `Closes in ${closesIn} days` : "No deadline set"}</span>
                      <span>{o.viewsCount} views</span>
                      <span>{o.savesCount} saves</span>
                    </div>
                  </div>
                  {o.status === "PUBLISHED" ? (
                    <Link
                      to="/opportunities/$opportunityId"
                      params={{ opportunityId: o.slug }}
                      className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft"
                    >
                      View listing
                    </Link>
                  ) : null}
                </div>
              </Panel>
            );
          })
        )}
      </div>
    </SiteShell>
  );
}
