import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import {
  api,
  isUnauthenticated,
  type ApiServiceOrder,
  type ApiServicePackage,
} from "@/lib/api-client";

export const Route = createFileRoute("/employers/services")({
  head: () => ({
    meta: [
      { title: "Employer Services - EOZ" },
      {
        name: "description",
        content: "Request and track EOZ recruitment, training, promotion and business services.",
      },
    ],
  }),
  component: EmployerServices,
});

const EMPLOYER_SERVICE_SLUGS = new Set([
  "business-profile",
  "recruitment-support",
  "marketing-promotion",
  "skills-training",
]);

function isEmployerService(service: ApiServicePackage) {
  return (
    EMPLOYER_SERVICE_SLUGS.has(service.slug) ||
    /employer|organisation|business|recruit|training|promotion/i.test(
      `${service.name} ${service.description}`,
    )
  );
}

function EmployerServices() {
  const packagesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<ApiServicePackage[]>("/services"),
  });
  const ordersQuery = useQuery({
    queryKey: ["employer", "service-orders"],
    queryFn: () => api.get<ApiServiceOrder[]>("/services/orders/mine"),
    retry: false,
  });
  const packages = (packagesQuery.data ?? []).filter(isEmployerService);
  const orders = ordersQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.6 ) - Services"
        title="Bring EOZ closer to the work."
        lead="Request advertising, recruitment, staffing, training and business support, then track the resulting quote and delivery status."
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(ordersQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">
            Sign in as an employer to view existing requests. The configured catalogue is still
            available below.
          </p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="grid gap-4 md:grid-cols-2 lg:col-span-8">
          {packagesQuery.isLoading ? (
            <Panel className="py-10 text-center text-sm text-muted md:col-span-2">
              Loading employer services...
            </Panel>
          ) : null}
          {packagesQuery.isSuccess && packages.length === 0 ? (
            <Panel className="py-10 text-center text-sm text-muted md:col-span-2">
              No employer services are currently open for requests.
            </Panel>
          ) : null}
          {packages.map((service) => (
            <Panel key={service.slug}>
              <Chip tone="accent">Service</Chip>
              <h2 className="mt-3 font-display text-2xl">{service.name}</h2>
              <p className="mt-2 text-sm text-muted">{service.description}</p>
              <p className="label-mono mt-4">Turnaround - {service.turnaround}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-accent-soft">
                  {service.price > 0
                    ? `${service.currency} ${service.price.toLocaleString()}`
                    : "Custom quote"}
                </span>
                <Link
                  to="/services/$serviceSlug"
                  params={{ serviceSlug: service.slug }}
                  className="text-sm text-fg hover:text-accent-soft"
                >
                  View and request -&gt;
                </Link>
              </div>
            </Panel>
          ))}
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono">Your requests</div>
            {ordersQuery.isLoading ? (
              <p className="mt-3 text-sm text-muted">Loading requests...</p>
            ) : orders.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No service requests yet. Open a service to submit its requirements.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="border-t border-line pt-3 first:border-0 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-fg">{order.packageName}</div>
                        <div className="mt-1 font-mono text-[10px] text-muted">
                          {order.reference}
                        </div>
                      </div>
                      <Chip tone={order.status === "COMPLETED" ? "emerald" : "amber"}>
                        {order.status.replace(/_/g, " ")}
                      </Chip>
                    </div>
                    {order.latestQuoteAmount != null ? (
                      <div className="mt-2 text-xs text-amber">
                        Quote: {order.latestQuoteCurrency}{" "}
                        {order.latestQuoteAmount.toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel>
            <p className="text-xs leading-5 text-muted">
              Requests create a tracked service order. A quote, invoice and assigned officer appear
              only after EOZ reviews the submitted scope.
            </p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
