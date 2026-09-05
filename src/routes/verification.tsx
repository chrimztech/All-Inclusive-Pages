import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";

const CHECKS = [
  { t: "Source of record", d: "Every listing must trace back to an official notice: the organisation's website, portal, letterhead or gazetted advert." },
  { t: "Organisation identity", d: "We confirm the organisation exists, is contactable and that the person submitting represents it." },
  { t: "Application channel", d: "The stated way to apply must be the employer's own. Listings that route applications through EOZ are rejected." },
  { t: "No payment to apply", d: "Any listing demanding a fee from applicants is removed and the organisation is flagged." },
  { t: "Deadline and scope", d: "Closing dates, location and eligibility are checked against the original notice." },
  { t: "Re-checks", d: "Listings are re-checked when edited and archived automatically once the deadline passes." },
];

const FLAGS = [
  "A fee, 'processing charge' or airtime is requested before an interview.",
  "Contact happens only through a personal messaging number with no organisation name.",
  "You are asked to send bank details or an NRC scan before any offer.",
  "The advert is copied from another employer with the contact swapped.",
];

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Verification & Trust — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "How EOZ verifies every Zambian opportunity before publishing: source of record, organisation identity, official application channel and scam warning signs.",
      },
      { property: "og:title", content: "Verification & Trust — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "The checks behind the verified badge, and the warning signs of a fraudulent listing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verification,
});

function Verification() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 11 ) — Verification"
        title="What the verified badge actually means."
        lead="A listing is only published once our staff have traced it to an official source and confirmed the employer's own application channel."
        aside={
          <Panel>
            <Chip tone="amber">Reminder</Chip>
            <p className="mt-3 text-sm text-muted">{ORG.disclaimer}</p>
          </Panel>
        }
      />

      <section className="grid gap-4 pb-10 lg:grid-cols-3">
        {CHECKS.map((c) => (
          <Panel key={c.t}>
            <h2 className="font-display text-lg tracking-tight">{c.t}</h2>
            <p className="mt-2 text-sm text-muted">{c.d}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-4 pb-14 lg:grid-cols-2">
        <Panel>
          <div className="eyebrow mb-3">Warning signs</div>
          <ul className="space-y-3 text-sm text-muted">
            {FLAGS.map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <div className="eyebrow mb-3">Seen something wrong?</div>
          <p className="text-sm text-muted">
            Report the listing and we will take it down while we re-check the source. You can also reach the team
            on {ORG.phone} or {ORG.email}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/report" className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink">
              Report a listing
            </Link>
            <Link to="/faq" className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg">
              Read the FAQ
            </Link>
          </div>
        </Panel>
      </section>
    </SiteShell>
  );
}
