import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, Panel, PageIntro, Chip } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { ORG } from "@/lib/eoz-data";
import { api, isUnauthenticated, type ApiApplication } from "@/lib/api-client";

export const Route = createFileRoute("/candidate/applications")({
  head: () => ({
    meta: [
      { title: "Application Tracker — EOZ Candidate Portal" },
      {
        name: "description",
        content: "Track the status of every opportunity you applied for directly through EOZ.",
      },
      { property: "og:title", content: "Application Tracker — EOZ Candidate Portal" },
      {
        property: "og:description",
        content: "A status timeline for EOZ-hosted applications.",
      },
    ],
  }),
  component: Applications,
});

const STATUS_ORDER = ["SUBMITTED", "SCREENING", "LONGLISTED", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED"];

const STATUS_TONE: Record<string, "emerald" | "amber" | "rose" | "accent" | "muted"> = {
  HIRED: "emerald",
  OFFER: "emerald",
  REJECTED: "rose",
  WITHDRAWN: "muted",
};

function Applications() {
  const applicationsQuery = useQuery({
    queryKey: ["candidate", "applications"],
    queryFn: () => api.get<ApiApplication[]>("/candidate/applications"),
    retry: false,
  });
  const applications = applicationsQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.1 ) — Applications"
        title="Track what you sent, and where."
        lead="Applications you submitted through EOZ for opportunities that accept EOZ-hosted applications."
      />
      <DashNav items={CANDIDATE_NAV} />

      <section className="space-y-3 pb-14">
        {isUnauthenticated(applicationsQuery.error) ? (
          <Panel>
            <p className="text-sm text-muted">Sign in as a candidate to see your applications.</p>
          </Panel>
        ) : null}
        {applicationsQuery.isSuccess && applications.length === 0 ? (
          <Panel>
            <p className="text-sm text-muted">
              No EOZ-hosted applications yet. Most opportunities are applied for directly with the employer.
            </p>
          </Panel>
        ) : null}
        {applications.map((a) => {
          const stageIndex = Math.max(0, STATUS_ORDER.indexOf(a.status));
          const terminal = a.status === "REJECTED" || a.status === "WITHDRAWN";
          return (
            <Panel key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl tracking-tight">{a.opportunityTitle}</h2>
                  <div className="mt-1 text-sm text-muted">
                    {a.organisationName} · Ref {a.reference}
                  </div>
                </div>
                <div className="text-right">
                  <Chip tone={STATUS_TONE[a.status] ?? "accent"}>{a.status}</Chip>
                  <div className="label-mono mt-1">Updated {new Date(a.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
              {!terminal ? (
                <ol className="mt-5 grid gap-2 sm:grid-cols-7">
                  {STATUS_ORDER.map((stage, i) => (
                    <li key={stage}>
                      <div className={`h-1 rounded-full ${i <= stageIndex ? "accent-gradient" : "bg-line"}`} />
                      <div className={`mt-2 font-mono text-[9px] ${i <= stageIndex ? "text-fg" : "text-muted"}`}>
                        {stage}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
            </Panel>
          );
        })}
        <Panel>
          <p className="text-xs text-muted">{ORG.disclaimer}</p>
        </Panel>
      </section>
    </SiteShell>
  );
}
