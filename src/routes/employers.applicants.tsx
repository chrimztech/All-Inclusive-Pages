import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { ORG } from "@/lib/eoz-data";
import { api, isUnauthenticated, type PageResponse } from "@/lib/api-client";

export const Route = createFileRoute("/employers/applicants")({
  head: () => ({
    meta: [
      { title: "Applicant Interest — EOZ Employer Portal" },
      {
        name: "description",
        content:
          "See referral interest for each listing. Applications themselves arrive through your own official channel.",
      },
      { property: "og:title", content: "Applicant Interest — EOZ Employer Portal" },
      {
        property: "og:description",
        content: "View and save counts per listing, with applications handled on your own channel.",
      },
    ],
  }),
  component: Applicants,
});

type EmployerOpportunity = {
  id: string;
  title: string;
  region: string | null;
  viewsCount: number;
  savesCount: number;
  status: string;
};

function Applicants() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["employer", "opportunities", "mine"],
    queryFn: () => api.get<PageResponse<EmployerOpportunity>>("/opportunities/mine", { size: 50 }),
    retry: false,
  });

  const rows = (data?.items ?? []).filter((o) => o.status === "PUBLISHED" || o.status === "CLOSED");

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.3 ) — Applicants"
        title="Interest, not inboxes."
        lead="EOZ shows you how many candidates viewed or saved your listing. Their applications go straight to your official channel."
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as an employer to see applicant interest.</p>
        </Panel>
      ) : null}

      <Panel className="mb-4 overflow-x-auto">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No published listings yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="label-mono">
                <th className="pb-3">Listing</th>
                <th className="pb-3">Region</th>
                <th className="pb-3">Views</th>
                <th className="pb-3">Saves</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-3 pr-4">{r.title}</td>
                  <td className="py-3 pr-4 text-muted">{r.region ?? "National"}</td>
                  <td className="py-3 pr-4">{r.viewsCount}</td>
                  <td className="py-3 pr-4 text-muted">{r.savesCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel className="mb-14">
        <p className="text-xs text-muted">{ORG.disclaimer}</p>
      </Panel>
    </SiteShell>
  );
}
