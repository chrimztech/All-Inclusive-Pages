import { createFileRoute, Link } from "@tanstack/react-router";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/employers/recruitment")({
  head: () => ({
    meta: [
      { title: "Recruitment Projects - EOZ Employer Portal" },
      {
        name: "description",
        content: "Request an authorised EOZ-managed recruitment engagement for your organisation.",
      },
    ],
  }),
  component: EmployerRecruitment,
});

function EmployerRecruitment() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.8 ) - Recruitment"
        title="Managed hiring support, on request."
        lead="EOZ recruitment staff run shortlisting and interview coordination as a paid engagement. Candidate private notes remain visible only to authorised EOZ recruitment staff."
        aside={
          <Panel>
            <Link
              to="/contact"
              className="accent-gradient inline-flex rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Request recruitment support
            </Link>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <div className="label-mono mb-3">How it works</div>
          <ol className="space-y-3 text-sm text-muted">
            <li>1. Request recruitment support with the role details and timeline.</li>
            <li>2. An EOZ recruiter confirms scope, fee and an authorised project owner on your side.</li>
            <li>3. Once live, you can review shortlists and interview feedback here.</li>
          </ol>
          <p className="mt-6 text-sm text-muted">
            You don't have an active recruitment engagement yet.
          </p>
        </Panel>
        <aside className="lg:col-span-4">
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
