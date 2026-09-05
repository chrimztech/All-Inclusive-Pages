import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "The terms governing use of the Echo Opportunities Zambia platform by candidates, employers and service clients.",
      },
      { property: "og:title", content: "Terms of Use — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Platform role, listing accuracy, employer obligations and limitations of liability.",
      },
    ],
  }),
  component: Terms,
});

const SECTIONS = [
  {
    t: "Our role",
    b: "EOZ is a distribution and curation platform. We publish opportunities sourced from employers, funders and institutions. We are not an employer, agent or intermediary in any application.",
  },
  {
    t: "Applications",
    b: "All applications must be made directly with the employer through their official channel as stated on the listing. EOZ does not accept, store or forward applications and cannot influence any selection decision.",
  },
  {
    t: "Accuracy",
    b: "We verify sources before publication, but details can change after posting. Always confirm requirements and deadlines on the employer's own channel before applying.",
  },
  {
    t: "Employer obligations",
    b: "Employers must supply accurate details, a valid official application method and a genuine deadline, and must never charge candidates a fee to apply. Listings breaching this are removed.",
  },
  {
    t: "Candidate conduct",
    b: "Do not misrepresent your qualifications, scrape the platform, or republish listings commercially without permission.",
  },
  {
    t: "Paid services",
    b: "Professional services are delivered by EOZ under separately agreed scope, price and turnaround. They do not guarantee employment, funding or selection.",
  },
  {
    t: "Liability",
    b: "EOZ is not liable for losses arising from reliance on a third-party listing, from an employer's conduct, or from any outcome of an application.",
  },
];

function Terms() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 12 ) — Terms"
        title="Terms of use."
        lead={`The rules governing use of ${ORG.name}.`}
      />
      <section className="max-w-[70ch] space-y-8 pb-14">
        {SECTIONS.map((s, i) => (
          <div key={s.t}>
            <div className="label-mono mb-1">{String(i + 1).padStart(2, "0")}</div>
            <h2 className="font-display text-2xl tracking-tight">{s.t}</h2>
            <p className="mt-2 text-muted">{s.b}</p>
          </div>
        ))}
        <p className="text-sm text-muted">
          Queries: {ORG.email} · {ORG.phone} · {ORG.location}
        </p>
      </section>
    </SiteShell>
  );
}
