import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { useOrgSettings } from "@/lib/use-org-settings";
import { api } from "@/lib/api-client";

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

type ApiServicePackage = {
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  turnaround: string;
  includes: string[];
};

function Services() {
  const org = useOrgSettings();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<ApiServicePackage[]>("/services"),
  });

  const services = data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 07 ) — Services"
        title="Help that improves your odds."
        lead="Distribution is free. These are the paid services our team delivers directly, with fixed prices and stated turnaround."
        aside={
          <div>
            <Panel>
              <div className="label-mono mb-2">Book a service</div>
              <p className="text-sm text-muted">
                Call {org.phone} or email {org.email}. Payment is arranged before work begins.
              </p>
              <Link to="/contact" className="mt-3 inline-block text-sm text-accent-soft">
                Contact the services desk →
              </Link>
            </Panel>
            <Panel className="mt-3">
              <div className="label-mono mb-2">Need software built?</div>
              <p className="text-sm text-muted">
                Systems, web and mobile apps, databases and maintenance from our developer partner.
              </p>
              <Link to="/developer-services" className="mt-3 inline-block text-sm text-accent-soft">
                Developer services →
              </Link>
            </Panel>
          </div>
        }
      />

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        {isLoading ? (
          <Panel className="lg:col-span-3 py-12 text-center text-sm text-muted">
            Loading services…
          </Panel>
        ) : isError ? (
          <Panel className="lg:col-span-3 py-12 text-center text-sm text-muted">
            Could not load the service catalogue right now. Please try again shortly.
          </Panel>
        ) : (
          services.map((s) => (
            <Panel key={s.slug}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl tracking-tight">{s.name}</h2>
                <Chip tone="amber">
                  {s.currency} {s.price.toLocaleString()}
                </Chip>
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
          ))
        )}
      </section>
      <Panel className="mb-14">
        <div className="label-mono mb-2">Important distinction</div>
        <p className="text-sm leading-6 text-muted">
          Ordering a CV, cover letter or application-support service does not apply for a vacancy.
          For every opportunity, use the employer&apos;s official application route shown on the
          listing. EOZ service contacts are for support bookings only.
        </p>
      </Panel>
    </SiteShell>
  );
}
