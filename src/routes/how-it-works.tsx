import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";

const CANDIDATE_STEPS = [
  { n: "01", t: "Discover", d: "Filter jobs, internships, scholarships, grants, tenders and training by category, region and deadline." },
  { n: "02", t: "Check the source", d: "Every listing shows the organisation, the official source and a reference number you can quote." },
  { n: "03", t: "Apply directly", d: "Use the employer's own application method. EOZ never collects or forwards your documents." },
  { n: "04", t: "Track it yourself", d: "Save listings and record your own progress so nothing lapses before the closing date." },
];

const EMPLOYER_STEPS = [
  { n: "01", t: "Register", d: "Create an organisation account with a contact person and your official web presence." },
  { n: "02", t: "Submit a listing", d: "Provide the role, closing date and — required — the official channel candidates must use." },
  { n: "03", t: "Review", d: "Our staff verify the source before publication, usually within one working day." },
  { n: "04", t: "Reach candidates", d: "Once approved, the listing is distributed across the board and our channels until it closes." },
];

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "How EOZ distributes verified Zambian opportunities: candidates discover and apply directly with employers, organisations submit listings for staff review.",
      },
      { property: "og:title", content: "How It Works — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "The candidate journey, the employer journey and the review step in between.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

function Steps({ items }: { items: typeof CANDIDATE_STEPS }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {items.map((s) => (
        <Panel key={s.n}>
          <div className="font-mono text-xs text-amber">{s.n}</div>
          <h3 className="mt-2 font-display text-lg tracking-tight">{s.t}</h3>
          <p className="mt-2 text-sm text-muted">{s.d}</p>
        </Panel>
      ))}
    </div>
  );
}

function HowItWorks() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 10 ) — How it works"
        title="Curated, verified, then handed straight to the employer."
        lead="EOZ is a distribution platform. We find and check opportunities across Zambia, then send you to the organisation's own door."
        aside={
          <Panel>
            <Chip tone="amber">Important</Chip>
            <p className="mt-3 text-sm text-muted">{ORG.disclaimer}</p>
          </Panel>
        }
      />

      <section className="pb-10">
        <div className="eyebrow mb-4">For candidates</div>
        <Steps items={CANDIDATE_STEPS} />
      </section>

      <section className="pb-10">
        <div className="eyebrow mb-4">For organisations</div>
        <Steps items={EMPLOYER_STEPS} />
      </section>

      <Panel className="mb-14 flex flex-wrap items-center gap-3">
        <Link to="/opportunities" className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink">
          Browse opportunities
        </Link>
        <Link to="/employers/post" className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg">
          Post an opportunity
        </Link>
        <Link to="/verification" className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg">
          How verification works
        </Link>
      </Panel>
    </SiteShell>
  );
}
