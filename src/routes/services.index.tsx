import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ORG, SERVICES } from "@/lib/eoz-data";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Professional Services — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "CV writing, cover letters, interview coaching, LinkedIn optimisation, business profiles and recruitment support from EOZ in Lusaka.",
      },
      { property: "og:title", content: "Professional Services — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Paid career and organisational services delivered by the EOZ team in Zambia.",
      },
    ],
  }),
  component: Services,
});

function Services() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 07 ) — Services"
        title="Help that improves your odds."
        lead="Distribution is free. These are the paid services our team delivers directly, with fixed prices and stated turnaround."
        aside={
          <Panel>
            <div className="label-mono mb-2">Book a service</div>
            <p className="text-sm text-muted">
              Call {ORG.phone} or email {ORG.email}. Payment is arranged before work begins.
            </p>
            <Link to="/contact" className="mt-3 inline-block text-sm text-accent-soft">
              Contact the services desk →
            </Link>
          </Panel>
        }
      />

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <Panel key={s.slug}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl tracking-tight">{s.name}</h2>
              <Chip tone="amber">{s.price}</Chip>
            </div>
            <div className="label-mono mt-1">{s.turnaround}</div>
            <p className="mt-3 text-sm text-muted">{s.description}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {s.includes.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent-soft">—</span>
                  <span className="text-muted">{i}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/services/$serviceSlug"
              params={{ serviceSlug: s.slug }}
              className="mt-4 inline-block text-sm text-accent-soft"
            >
              View details →
            </Link>
          </Panel>
        ))}
      </section>
    </SiteShell>
  );
}
