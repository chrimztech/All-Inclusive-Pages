import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, type ApiServicePackage } from "@/lib/api-client";
import { isEmployer } from "@/lib/access";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/employers/pricing")({
  head: () => ({
    meta: [
      { title: "Employer Service Pricing - Echo Opportunities Zambia" },
      {
        name: "description",
        content: "Current EOZ employer-service prices and custom-quote services.",
      },
      { property: "og:title", content: "Employer Service Pricing - Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Configured prices for EOZ recruitment, training and business support.",
      },
    ],
  }),
  component: EmployerPricing,
});

function EmployerPricing() {
  const { user } = useCurrentUser();
  const packagesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<ApiServicePackage[]>("/services"),
  });
  const packages = (packagesQuery.data ?? []).filter(
    (service) =>
      [
        "business-profile",
        "recruitment-support",
        "marketing-promotion",
        "skills-training",
      ].includes(service.slug) ||
      /employer|organisation|business|recruit|training|promotion/i.test(
        `${service.name} ${service.description}`,
      ),
  );

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05 ) - Employer portal"
        title="Employer service pricing"
        lead="Current catalogue prices and custom-quote services, maintained by EOZ staff from the service administration screen."
        aside={
          <Panel>
            <Chip tone="amber">Configured live</Chip>
            <p className="mt-3 text-sm text-muted">
              Final recruitment and campaign fees depend on the approved scope. A tracked quote is
              issued before any payment is due.
            </p>
          </Panel>
        }
      />
      {isEmployer(user) ? <DashNav items={EMPLOYER_NAV} /> : null}

      <section className="grid gap-4 pb-10 lg:grid-cols-3">
        {packagesQuery.isLoading ? (
          <Panel className="py-10 text-center text-sm text-muted lg:col-span-3">
            Loading current prices...
          </Panel>
        ) : null}
        {packagesQuery.isSuccess && packages.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-muted lg:col-span-3">
            No employer service prices are currently published.
          </Panel>
        ) : null}
        {packages.map((service) => (
          <Panel key={service.slug}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl tracking-tight">{service.name}</h2>
              <Chip tone={service.price > 0 ? "amber" : "accent"}>
                {service.price > 0 ? "Fixed price" : "Custom quote"}
              </Chip>
            </div>
            <div className="mt-3 font-display text-3xl text-amber">
              {service.price > 0
                ? `${service.currency} ${service.price.toLocaleString()}`
                : "Scope first"}
            </div>
            <div className="text-xs text-muted">{service.turnaround}</div>
            <p className="mt-4 text-sm text-muted">{service.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {service.includes.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/services/$serviceSlug"
              params={{ serviceSlug: service.slug }}
              className="accent-gradient mt-5 block rounded-md px-4 py-2 text-center text-sm font-medium text-ink"
            >
              View and request
            </Link>
          </Panel>
        ))}
      </section>

      <Panel className="mb-14">
        <div className="eyebrow mb-2">Opportunity publishing</div>
        <p className="text-sm text-muted">
          Ready to publish a vacancy instead? Create the listing first; EOZ will review its official
          application route before publication.{" "}
          <Link to="/employers/post" className="text-amber hover:underline">
            Post an opportunity -&gt;
          </Link>
        </p>
      </Panel>
    </SiteShell>
  );
}
