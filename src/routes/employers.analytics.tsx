import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { api, isUnauthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/employers/analytics")({
  head: () => ({ meta: [{ title: "Employer Analytics — EOZ" }] }),
  component: Analytics,
});

type AnalyticsSummary = {
  listingsCount: number;
  totalViews: number;
  totalSaves: number;
  topListings: { title: string; slug: string; viewsCount: number }[];
  categoryMix: { categoryName: string; count: number }[];
};

function Analytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["employer", "analytics"],
    queryFn: () => api.get<AnalyticsSummary>("/opportunities/mine/analytics"),
    retry: false,
  });

  const bestCategory = data?.categoryMix[0]?.categoryName ?? "—";
  const maxViews = Math.max(1, ...(data?.topListings.map((l) => l.viewsCount) ?? [1]));

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.5 ) — Analytics"
        title="See how your opportunities travel."
        lead="EOZ reports distribution and save activity. Applications remain on your official channel and are not counted here."
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as an employer to see your analytics.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total views" value={String(data?.totalViews ?? "—")} />
        <StatTile label="Total saves" value={String(data?.totalSaves ?? "—")} />
        <StatTile label="Listings" value={String(data?.listingsCount ?? "—")} />
        <StatTile label="Best category" value={bestCategory} />
      </div>

      <section className="grid gap-6 pb-14 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <div className="label-mono">Category mix</div>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted">Loading…</p>
          ) : !data?.categoryMix.length ? (
            <p className="mt-4 text-sm text-muted">No published listings yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {data.categoryMix.map((c) => (
                <div key={c.categoryName}>
                  <div className="flex justify-between text-sm">
                    <span>{c.categoryName}</span>
                    <span className="text-muted">{c.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-line">
                    <div
                      className="h-1.5 rounded-full bg-accent"
                      style={{ width: `${(c.count / data.listingsCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel className="lg:col-span-2">
          <div className="label-mono">Top listings</div>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted">Loading…</p>
          ) : !data?.topListings.length ? (
            <p className="mt-4 text-sm text-muted">No listings yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {data.topListings.map((l) => (
                <div key={l.slug}>
                  <div className="text-sm">{l.title}</div>
                  <div className="mt-1 text-xs text-muted">{l.viewsCount} views</div>
                  <div className="mt-2 h-1 rounded-full bg-line">
                    <div
                      className="h-1 rounded-full bg-accent"
                      style={{ width: `${(l.viewsCount / maxViews) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </SiteShell>
  );
}
