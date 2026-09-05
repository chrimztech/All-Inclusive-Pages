import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";

const PLANS = [
  {
    name: "Public interest",
    price: "Free",
    note: "Government, NGO and scholarship notices",
    includes: ["Unlimited standard listings", "Staff verification", "Standard board placement", "Auto-archive at deadline"],
    featured: false,
  },
  {
    name: "Standard",
    price: "K450",
    note: "per listing, 30 days",
    includes: ["Verified badge", "Board + channel distribution", "Applicant funnel view", "Edit until the closing date"],
    featured: true,
  },
  {
    name: "Featured",
    price: "K1,200",
    note: "per listing, 30 days",
    includes: ["Top-of-board placement", "Highlighted card", "Shared on all EOZ channels", "Weekly performance summary"],
    featured: false,
  },
];

export const Route = createFileRoute("/employers/pricing")({
  head: () => ({
    meta: [
      { title: "Employer Pricing — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "EOZ listing plans for Zambian employers: free public-interest notices, standard verified listings and featured placement with channel distribution.",
      },
      { property: "og:title", content: "Employer Pricing — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Simple per-listing pricing for organisations posting on Echo Opportunities Zambia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmployerPricing,
});

function EmployerPricing() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05 ) — Employer portal"
        title="Pricing"
        lead="Pay per listing. No subscriptions, no charge to candidates, ever."
        aside={
          <Panel>
            <Chip tone="amber">Note</Chip>
            <p className="mt-3 text-sm text-muted">
              Prices shown are examples for this preview. Send us your real rate card and we will put it in.
            </p>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />

      <section className="grid gap-4 pb-10 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Panel key={p.name} className={p.featured ? "ring-2 ring-amber/40" : ""}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl tracking-tight">{p.name}</h2>
              {p.featured ? <Chip tone="amber">Popular</Chip> : null}
            </div>
            <div className="mt-3 font-display text-3xl text-amber">{p.price}</div>
            <div className="text-xs text-muted">{p.note}</div>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {p.includes.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/employers/post"
              className={`mt-5 block rounded-md px-4 py-2 text-center text-sm ${
                p.featured ? "accent-gradient font-medium text-ink" : "text-muted ring-1 ring-line hover:text-fg"
              }`}
            >
              Post a listing
            </Link>
          </Panel>
        ))}
      </section>

      <Panel className="mb-14">
        <div className="eyebrow mb-2">Bulk and annual</div>
        <p className="text-sm text-muted">
          Posting more than ten roles a year? We arrange an invoiced package with a named account contact.{" "}
          <Link to="/contact" className="text-amber hover:underline">
            Talk to the team →
          </Link>
        </p>
      </Panel>
    </SiteShell>
  );
}
