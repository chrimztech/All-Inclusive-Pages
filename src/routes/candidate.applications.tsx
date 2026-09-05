import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, Panel, PageIntro, Chip } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { APPLICATIONS, APPLICATION_STAGES, ORG } from "@/lib/eoz-data";

export const Route = createFileRoute("/candidate/applications")({
  head: () => ({
    meta: [
      { title: "Application Tracker — EOZ Candidate Portal" },
      {
        name: "description",
        content:
          "Self-report and follow the progress of every opportunity you have applied for directly with employers.",
      },
      { property: "og:title", content: "Application Tracker — EOZ Candidate Portal" },
      {
        property: "og:description",
        content: "A simple stage tracker for applications made through employer channels.",
      },
    ],
  }),
  component: Applications,
});

function Applications() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.1 ) — Applications"
        title="Track what you sent, and where."
        lead="EOZ never receives your application. This tracker records what you told us, so nothing slips past a deadline."
      />
      <DashNav items={CANDIDATE_NAV} />

      <section className="space-y-3 pb-14">
        {APPLICATIONS.map((a) => (
          <Panel key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl tracking-tight">{a.role}</h2>
                <div className="mt-1 text-sm text-muted">
                  {a.organisation} · applied via {a.channel}
                </div>
              </div>
              <div className="text-right">
                <Chip tone={a.stage >= 3 ? "emerald" : "accent"}>{a.status}</Chip>
                <div className="label-mono mt-1">{a.updated}</div>
              </div>
            </div>
            <ol className="mt-5 grid gap-2 sm:grid-cols-5">
              {APPLICATION_STAGES.map((stage, i) => (
                <li key={stage}>
                  <div
                    className={`h-1 rounded-full ${i <= a.stage ? "accent-gradient" : "bg-line"}`}
                  />
                  <div
                    className={`mt-2 font-mono text-[10px] ${i <= a.stage ? "text-fg" : "text-muted"}`}
                  >
                    {stage}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        ))}
        <Panel>
          <p className="text-xs text-muted">{ORG.disclaimer}</p>
        </Panel>
      </section>
    </SiteShell>
  );
}
