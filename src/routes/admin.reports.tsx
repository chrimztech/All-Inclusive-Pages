import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { api, isUnauthenticated } from "@/lib/api-client";

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

type NameCount = { name: string; count: number };
type Overview = {
  publishedOpportunities: number;
  pendingReview: number;
  archivedOrRejected: number;
  categoryMix: NameCount[];
  regionMix: NameCount[];
  applicationsByStatus: NameCount[];
  serviceOrdersByStatus: NameCount[];
  unpaidInvoices: number;
  paidInvoices: number;
};

function Bars({ data }: { data: NameCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.name}>
          <div className="mb-1 flex justify-between text-xs">
            <span>{d.name}</span>
            <span className="font-mono text-muted">{d.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-line">
            <div className="accent-gradient h-1.5 rounded-full" style={{ width: `${(d.count / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Reports() {
  const overviewQuery = useQuery({
    queryKey: ["admin", "reports", "overview"],
    queryFn: () => api.get<Overview>("/admin/reports/overview"),
    retry: false,
  });
  const data = overviewQuery.data;

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.4 ) — Reports"
        title="What the platform actually distributed."
        lead="Reporting covers listings published, categories represented and how quickly submissions were reviewed."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(overviewQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a manager, admin or auditor account to view reports.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Published" value={String(data?.publishedOpportunities ?? "—")} />
        <StatTile label="Pending review" value={String(data?.pendingReview ?? "—")} tone="text-amber" />
        <StatTile label="Rejected / archived" value={String(data?.archivedOrRejected ?? "—")} tone="text-rose" />
        <StatTile label="Paid invoices" value={String(data?.paidInvoices ?? "—")} />
      </div>

      <section className="grid gap-6 pb-14 lg:grid-cols-2">
        <Panel>
          <div className="label-mono mb-4">Listings by category</div>
          {data && data.categoryMix.length > 0 ? <Bars data={data.categoryMix} /> : <p className="text-sm text-muted">No published listings yet.</p>}
        </Panel>
        <Panel>
          <div className="label-mono mb-4">Reach by region</div>
          {data && data.regionMix.length > 0 ? <Bars data={data.regionMix} /> : <p className="text-sm text-muted">No regional data yet.</p>}
        </Panel>
        <Panel>
          <div className="label-mono mb-4">Applications by status</div>
          {data && data.applicationsByStatus.length > 0 ? (
            <Bars data={data.applicationsByStatus} />
          ) : (
            <p className="text-sm text-muted">No EOZ-hosted applications yet.</p>
          )}
        </Panel>
        <Panel>
          <div className="label-mono mb-4">Service orders by status</div>
          {data && data.serviceOrdersByStatus.length > 0 ? (
            <Bars data={data.serviceOrdersByStatus} />
          ) : (
            <p className="text-sm text-muted">No service orders yet.</p>
          )}
        </Panel>
      </section>
    </SiteShell>
  );
}
