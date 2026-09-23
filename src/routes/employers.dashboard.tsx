import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { DeadlineChip } from "@/components/eoz/OpportunityCard";
import { api, isUnauthenticated, type PageResponse, type ApiOrganisation } from "@/lib/api-client";

function OnboardingChecklist({
  org,
  listingsCount,
}: {
  org: ApiOrganisation | undefined;
  listingsCount: number;
}) {
  if (!org) return null;

  const profileComplete = Boolean(org.businessType && org.description);
  const verified = org.verificationStatus === "VERIFIED";
  const hasListing = listingsCount > 0;
  const steps = [
    {
      done: profileComplete,
      label: "Complete your organisation profile",
      detail: "Add a logo, business type and description so candidates trust your listings.",
      to: "/employers/organisation" as const,
    },
    {
      done: verified,
      label: verified ? "Verified by EOZ" : "Awaiting EOZ verification",
      detail: verified
        ? "Your organisation is verified — listings show a verified badge."
        : "Submitted and pending — you can keep posting while this is in review.",
      to: "/employers/organisation" as const,
    },
    {
      done: hasListing,
      label: "Post your first opportunity",
      detail: "Submit → EOZ verification → distribution across WhatsApp, LinkedIn and more.",
      to: "/employers/post" as const,
    },
  ];

  if (steps.every((s) => s.done)) {
    return null;
  }

  return (
    <Panel className="mb-6">
      <div className="label-mono mb-3">Get set up</div>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className={`block rounded-md p-3 ring-1 transition-colors ${s.done ? "ring-emerald/30" : "ring-line hover:ring-accent/40"}`}
          >
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${s.done ? "bg-emerald" : "bg-amber"}`} />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{s.detail}</p>
          </Link>
        ))}
      </div>
      {org.businessType === "INFORMAL_SME" ? (
        <div className="mt-4 rounded-md bg-surface-2 p-3 text-xs text-muted ring-1 ring-line">
          Small or new business? Our{" "}
          <Link to="/employers/services" className="text-accent-soft hover:text-fg">
            Business &amp; Company Profile service
          </Link>{" "}
          helps you look credible when bidding for contracts, grants and partnerships.
        </div>
      ) : null}
    </Panel>
  );
}

export const Route = createFileRoute("/employers/dashboard")({
  head: () => ({
    meta: [
      { title: "Employer Dashboard — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Monitor listing performance, review states and deadlines for your EOZ opportunities.",
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
  const orgsQuery = useQuery({
    queryKey: ["employer", "organisations", "mine"],
    queryFn: () => api.get<ApiOrganisation[]>("/organisations/mine"),
    retry: false,
  });

  const mine = listingsQuery.data?.items ?? [];
  const stats = statsQuery.data;
  const totalViews = mine.reduce((sum, o) => sum + o.viewsCount, 0);
  const org = orgsQuery.data?.[0];
  const totalListings = stats
    ? stats.published + stats.pendingReview + stats.drafts + stats.closed
    : mine.length;

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

      <OnboardingChecklist org={org} listingsCount={totalListings} />

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Live listings" value={String(stats?.published ?? "—")} />
        <StatTile label="Views (recent listings)" value={String(totalViews)} />
        <StatTile label="Drafts" value={String(stats?.drafts ?? "—")} />
        <StatTile
          label="Awaiting review"
          value={String(stats?.pendingReview ?? "—")}
          tone="text-amber"
        />
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
            return (
              <Panel key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Chip>{o.categoryName}</Chip>
                      <Chip tone={o.status === "PUBLISHED" ? "emerald" : "amber"}>
                        {o.status.replace(/_/g, " ")}
                      </Chip>
                      {o.status === "PUBLISHED" ? <DeadlineChip deadline={o.deadline} /> : null}
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
                    <div className="mt-1 text-sm text-muted">Ref {o.reference}</div>
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
