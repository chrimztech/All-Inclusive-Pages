import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { CANDIDATE_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { WorkspaceList, type WorkspaceRecord } from "@/components/eoz/PortalKit";
import { PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/candidate/orders")({
  head: () => ({
    meta: [
      { title: "Service Orders - EOZ Candidate Portal" },
      {
        name: "description",
        content: "Track career-service quotes, payments, deliverables and revisions.",
      },
    ],
  }),
  component: ServiceOrders,
});

const ORDERS: WorkspaceRecord[] = [
  {
    id: "EOZ-SVC-2026-000044",
    title: "ATS-friendly CV writing",
    subtitle: "Career documents · Assigned to Miriam",
    status: "In progress",
    tone: "accent",
    details: ["Due 7 Sep 2026", "K 350 paid", "2 revisions included"],
    action: "View order",
  },
  {
    id: "EOZ-SVC-2026-000031",
    title: "Interview coaching",
    subtitle: "90-minute practice session",
    status: "Completed",
    tone: "emerald",
    details: ["Completed 16 Aug 2026", "K 400 paid", "Feedback available"],
    action: "Download feedback",
  },
  {
    id: "EOZ-SVC-2026-000052",
    title: "Tailored cover letter",
    subtitle: "Requirements received",
    status: "Quote ready",
    tone: "amber",
    details: ["Quote expires 10 Sep", "K 180", "1 revision included"],
    action: "Review quote",
  },
];

function ServiceOrders() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.7 ) - Service orders"
        title="Support you ordered, clearly tracked."
        lead="Follow each quote, payment, assignment, deliverable and revision without mixing professional services with vacancy applications."
        aside={
          <Panel>
            <Link
              to="/services"
              className="accent-gradient inline-flex rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Browse career services
            </Link>
          </Panel>
        }
      />
      <DashNav items={CANDIDATE_NAV} />
      <div className="grid gap-3 pb-6 sm:grid-cols-3">
        <StatTile label="Active" value="2" />
        <StatTile label="Awaiting you" value="1" tone="text-amber" />
        <StatTile label="Completed" value="6" />
      </div>
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <WorkspaceList records={ORDERS} searchLabel="Search orders by service or reference" />
        </div>
        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono">Current milestone</div>
            <h2 className="mt-2 font-display text-xl">CV first draft</h2>
            <p className="mt-2 text-sm text-muted">
              Your assigned officer is preparing the first draft. You will receive a notification
              when it is ready for review.
            </p>
            <div className="mt-4 h-1.5 rounded-full bg-line">
              <div className="accent-gradient h-full w-3/5 rounded-full" />
            </div>
          </Panel>
          <Panel>
            <div className="flex gap-3">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber" />
              <p className="text-xs leading-5 text-muted">
                Ordering a CV, cover letter or coaching service does not apply for any vacancy. You
                must still use the employer's official application route.
              </p>
            </div>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
