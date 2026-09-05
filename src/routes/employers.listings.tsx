import { createFileRoute, Link } from "@tanstack/react-router";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { WorkspaceList, type WorkspaceRecord } from "@/components/eoz/PortalKit";
import { PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

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

const LISTINGS: WorkspaceRecord[] = [
  {
    id: "EOZ-OPP-2026-000041",
    title: "Senior Data Analyst",
    subtitle: "Mfumu Analytics · Hybrid · Lusaka",
    status: "Published",
    tone: "emerald",
    details: ["Closes 7 Sep 2026", "1,924 views", "External employer portal"],
    action: "Manage",
  },
  {
    id: "EOZ-OPP-2026-000058",
    title: "Product Support Associate",
    subtitle: "Mfumu Analytics · On-site · Lusaka",
    status: "Pending review",
    tone: "amber",
    details: ["Submitted today", "Source confirmed", "Employer email"],
    action: "Review submission",
  },
  {
    id: "EOZ-OPP-2026-000033",
    title: "Junior Research Assistant",
    subtitle: "Mfumu Analytics · Hybrid · Lusaka",
    status: "Draft",
    tone: "muted",
    details: ["Last edited yesterday", "3 fields incomplete", "Application route missing"],
    action: "Continue editing",
  },
  {
    id: "EOZ-OPP-2026-000012",
    title: "Data Graduate Internship",
    subtitle: "Mfumu Analytics · Full-time · Lusaka",
    status: "Closed",
    tone: "rose",
    details: ["Closed 18 Aug 2026", "3,206 views", "Eligible for renewal"],
    action: "Duplicate or renew",
  },
];

function EmployerListings() {
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
      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Published" value="4" />
        <StatTile label="Pending review" value="1" tone="text-amber" />
        <StatTile label="Drafts" value="2" />
        <StatTile label="Closed" value="11" />
      </div>
      <div className="pb-14">
        <WorkspaceList
          records={LISTINGS}
          searchLabel="Search listings by title, reference or status"
        />
      </div>
    </SiteShell>
  );
}
