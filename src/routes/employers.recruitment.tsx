import { createFileRoute } from "@tanstack/react-router";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { ProgressLine, WorkspaceList, type WorkspaceRecord } from "@/components/eoz/PortalKit";
import { PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/employers/recruitment")({
  head: () => ({
    meta: [
      { title: "Recruitment Projects - EOZ Employer Portal" },
      {
        name: "description",
        content: "Track authorised EOZ-managed recruitment engagements, shortlists and milestones.",
      },
    ],
  }),
  component: EmployerRecruitment,
});

const PROJECTS: WorkspaceRecord[] = [
  {
    id: "EOZ-REC-2026-000014",
    title: "Senior Data Analyst recruitment",
    subtitle: "Lead recruiter: Natasha Phiri",
    status: "Shortlisting",
    tone: "accent",
    details: ["18 screened", "6 longlisted", "Shortlist due 8 Sep"],
    action: "Open project",
  },
  {
    id: "EOZ-REC-2026-000009",
    title: "Customer Operations team",
    subtitle: "Three positions · Confidential",
    status: "Interview",
    tone: "amber",
    details: ["8 shortlisted", "5 interviewed", "Panel feedback due"],
    action: "Review interviews",
  },
  {
    id: "EOZ-REC-2026-000004",
    title: "Finance Manager search",
    subtitle: "Executive search engagement",
    status: "Completed",
    tone: "emerald",
    details: ["1 hire", "Closed 12 Aug", "Final report ready"],
    action: "View report",
  },
];

function EmployerRecruitment() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.8 ) - Recruitment"
        title="Your authorised hiring projects."
        lead="Follow milestones, review client-visible notes and approve shortlists. Candidate private notes remain visible only to authorised EOZ recruitment staff."
        aside={
          <Panel>
            <button
              type="button"
              className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Request recruitment support
            </button>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />
      <div className="grid gap-3 pb-6 sm:grid-cols-3">
        <StatTile label="Active projects" value="2" />
        <StatTile label="Candidates in process" value="31" />
        <StatTile label="Awaiting your review" value="5" tone="text-amber" />
      </div>
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <WorkspaceList records={PROJECTS} searchLabel="Search recruitment projects" />
        </div>
        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono mb-4">Senior Data Analyst funnel</div>
            <div className="space-y-4">
              <ProgressLine label="Screening complete" value={100} />
              <ProgressLine label="Longlist reviewed" value={72} />
              <ProgressLine label="Shortlist approved" value={35} />
            </div>
          </Panel>
          <Panel>
            <div className="label-mono">Access boundary</div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Employer members see applicant records only when EOZ has granted project-specific
              access. Every view and export is logged.
            </p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
