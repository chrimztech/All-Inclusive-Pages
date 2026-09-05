import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ORG, SERVICES } from "@/lib/eoz-data";

export const Route = createFileRoute("/services/$serviceSlug")({
  loader: ({ params }) => {
    const service = SERVICES.find((s) => s.slug === params.serviceSlug);
    if (!service) throw notFound();
    return { service };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Service unavailable — Echo Opportunities Zambia" }, { name: "robots", content: "noindex" }],
      };
    }
    const { service } = loaderData;
    const title = `${service.name} — EOZ Professional Services`;
    return {
      meta: [
        { title },
        { name: "description", content: service.description },
        { property: "og:title", content: title },
        { property: "og:description", content: service.description },
      ],
    };
  },
  notFoundComponent: ServiceMissing,
  component: ServiceDetail,
});

function ServiceMissing() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 07 ) — Services"
        title="That service is not listed."
        lead="It may have been renamed or retired. Browse the current service catalogue instead."
      />
      <Link to="/services" className="mb-14 inline-block text-sm text-accent-soft">
        ← Back to services
      </Link>
    </SiteShell>
  );
}

function ServiceDetail() {
  const { service } = Route.useLoaderData();
  const others = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 07 ) — Service"
        title={service.name}
        lead={service.description}
        aside={
          <Panel>
            <div className="label-mono mb-2">Fixed price</div>
            <div className="font-display text-3xl text-amber">{service.price}</div>
            <div className="label-mono mt-2">Turnaround · {service.turnaround}</div>
            <Link
              to="/contact"
              className="accent-gradient mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Book this service
            </Link>
            <p className="mt-3 text-xs text-muted">
              Call {ORG.phone} or email {ORG.email}. Payment is arranged before work begins.
            </p>
          </Panel>
        }
      />

      <section className="grid gap-4 pb-10 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <div className="label-mono mb-3">What is included</div>
          <ul className="space-y-2 text-sm">
            {service.includes.map((i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber">—</span>
                <span className="text-muted">{i}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="lg:col-span-5">
          <div className="label-mono mb-3">How it works</div>
          <ol className="space-y-2 text-sm text-muted">
            <li>1. Contact the services desk and confirm scope.</li>
            <li>2. Settle payment and share your material.</li>
            <li>3. Receive the first draft within the stated turnaround.</li>
            <li>4. Use your included revisions to finalise.</li>
          </ol>
        </Panel>
      </section>

      <section className="pb-14">
        <div className="eyebrow mb-4">Other services</div>
        <div className="grid gap-4 lg:grid-cols-3">
          {others.map((s) => (
            <Link key={s.slug} to="/services/$serviceSlug" params={{ serviceSlug: s.slug }}>
              <Panel className="h-full transition-colors hover:ring-accent/40">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg tracking-tight">{s.name}</h2>
                  <Chip tone="amber">{s.price}</Chip>
                </div>
                <p className="mt-3 text-sm text-muted">{s.description}</p>
              </Panel>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
