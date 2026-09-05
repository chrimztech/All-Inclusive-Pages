import { createFileRoute, Link } from "@tanstack/react-router";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { WorkspaceList, type WorkspaceRecord } from "@/components/eoz/PortalKit";
import { PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/admin/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunity Workspace - EOZ Staff" },
      {
        name: "description",
        content: "Create, verify, schedule and manage EOZ opportunity records.",
      },
    ],
  }),
  component: OpportunityWorkspace,
});

const RECORDS: WorkspaceRecord[] = [
  {
    id: "EOZ-OPP-2026-000061",
    title: "Clinical Research Coordinator",
    subtitle: "Copper Health Research Centre · Lusaka",
    status: "Draft",
    tone: "muted",
    details: ["5 required fields complete", "Source document attached", "No application route yet"],
    action: "Continue editing",
  },
  {
    id: "EOZ-OPP-2026-000058",
    title: "Product Support Associate",
    subtitle: "Mfumu Analytics · Lusaka",
    status: "Pending review",
    tone: "amber",
    details: ["Submitted today", "External source verified", "Deadline 18 Sep"],
    action: "Open review",
  },
  {
    id: "EOZ-OPP-2026-000054",
    title: "SME Export Readiness Grant",
    subtitle: "Fictional Enterprise Fund · National",
    status: "Scheduled",
    tone: "accent",
    details: ["Publishes 6 Sep, 08:00", "Information only", "Approved by M. Zulu"],
    action: "View schedule",
  },
  {
    id: "EOZ-OPP-2026-000041",
    title: "Senior Data Analyst",
    subtitle: "Mfumu Analytics · Lusaka",
    status: "Published",
    tone: "emerald",
    details: ["1,924 views", "Closes in 2 days", "External employer portal"],
    action: "Manage listing",
  },
  {
    id: "EOZ-OPP-2026-000023",
    title: "Finance Internship",
    subtitle: "BrightPath NGO · Ndola",
    status: "Changes requested",
    tone: "rose",
    details: ["Application email unverified", "Employer notified", "Owner: J. Banda"],
    action: "Review changes",
  },
];

function OpportunityWorkspace() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.1 ) - Opportunity workspace"
        title="The complete publication lifecycle."
        lead="Draft and maintain canonical opportunity records, verify employer-approved routes, schedule publication and close expired listings with an audit trail."
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
      <DashNav items={ADMIN_NAV} />
      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Drafts" value="13" />
        <StatTile label="Review queue" value="8" tone="text-amber" />
        <StatTile label="Scheduled" value="5" />
        <StatTile label="Live" value="142" />
      </div>
      <div className="pb-14">
        <WorkspaceList
          records={RECORDS}
          searchLabel="Search by title, reference, organisation or state"
        />
      </div>
    </SiteShell>
  );
}
