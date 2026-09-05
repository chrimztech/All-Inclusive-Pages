import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { ORG } from "@/lib/eoz-data";

export const Route = createFileRoute("/employers/")({
  head: () => ({
    meta: [
      { title: "For Employers — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Post verified jobs, internships, tenders and training to a Zambian audience. EOZ distributes your listing and sends candidates to your own application channel.",
      },
      { property: "og:title", content: "For Employers — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Reach verified candidates across Zambia while keeping applications on your own channel.",
      },
    ],
  }),
  component: Employers,
});

function Employers() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05 ) — Employers"
        title="Distribution that respects your process."
        lead="EOZ publishes your opportunity to candidates across Zambia and routes every applicant to your official application method. We never intercept applications."
        aside={
          <Panel>
            <div className="label-mono mb-2">Get started</div>
            <p className="text-sm text-muted">
              Register your organisation, submit a listing, and our review team verifies the source
              before publication.
            </p>
            <Link
              to="/employers/post"
              className="accent-gradient mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Post an opportunity
            </Link>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />

      <div className="grid gap-3 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Monthly reach" value="48k" />
        <StatTile label="Verified employers" value="120+" />
        <StatTile label="Median review time" value="6h" />
        <StatTile label="Categories" value="6" />
      </div>

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        {[
          {
            t: "Submit",
            d: "Complete the listing form with role details, deadline and your official application method.",
          },
          {
            t: "Verification",
            d: "EOZ staff confirm the organisation and the source link before the listing is published.",
          },
          {
            t: "Distribution",
            d: "Your listing appears on the board, in category feeds and in candidate deadline alerts.",
          },
        ].map((s, i) => (
          <Panel key={s.t}>
            <div className="label-mono">Step {i + 1}</div>
            <h2 className="mt-1 font-display text-xl tracking-tight">{s.t}</h2>
            <p className="mt-2 text-sm text-muted">{s.d}</p>
          </Panel>
        ))}
      </section>

      <Panel className="mb-14">
        <p className="text-xs text-muted">{ORG.disclaimer}</p>
      </Panel>
    </SiteShell>
  );
}
