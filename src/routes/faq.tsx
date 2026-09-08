import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";
import { useOrgSettings } from "@/lib/use-org-settings";

const FAQS = [
  {
    q: "Does EOZ receive my application?",
    a: "No. Every listing carries the employer's own official application method. You apply directly with the organisation; EOZ never accepts, stores or forwards applications.",
  },
  {
    q: "Is it free to browse opportunities?",
    a: "Yes. Discovery, filtering and deadline tracking are free for candidates. Only the professional services (CV writing, coaching and similar) are paid.",
  },
  {
    q: "What does the verified badge mean?",
    a: "It means our team traced the listing back to an official source — an employer careers page, a government tender portal or an accredited funder — before publication.",
  },
  {
    q: "How do employers post a vacancy?",
    a: "Create an employer account, submit the vacancy with its official application channel, and our staff review it before it appears publicly.",
  },
  {
    q: "How quickly are listings reviewed?",
    a: "Most submissions are reviewed within one working day. Tenders and grants with tight deadlines are prioritised.",
  },
  {
    q: "How do I report a suspicious listing?",
    a: `Contact us on ${ORG.phone} or email ${ORG.email} with the reference number. Listings under investigation are unpublished while we check the source.`,
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "How EOZ verifies listings, why applications go directly to employers, what is free, and how employers post vacancies in Zambia.",
      },
      { property: "og:title", content: "Frequently Asked Questions — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Answers on verification, applying directly to employers, pricing and posting vacancies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Faq,
});

function Faq() {
  const org = useOrgSettings();
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 09 ) — FAQ"
        title="Questions we answer daily."
        lead="If something is still unclear, the services desk in Lusaka will answer directly."
        aside={
          <Panel>
            <div className="label-mono mb-2">Still stuck?</div>
            <p className="text-sm text-muted">
              {org.phone} · {org.email}
            </p>
            <Link to="/contact" className="mt-3 inline-block text-sm text-accent-soft">
              Contact EOZ →
            </Link>
          </Panel>
        }
      />

      <section className="grid gap-4 pb-14 lg:grid-cols-2">
        {FAQS.map((f) => (
          <Panel key={f.q}>
            <h2 className="font-display text-lg tracking-tight text-amber">{f.q}</h2>
            <p className="mt-2 text-sm text-muted">{f.a}</p>
          </Panel>
        ))}
      </section>
    </SiteShell>
  );
}
