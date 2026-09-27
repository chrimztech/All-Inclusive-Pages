import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import {
  api,
  ApiError,
  isUnauthenticated,
  type ApiServiceOrder,
  type ApiServicePackage,
} from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/employers/recruitment")({
  head: () => ({
    meta: [
      { title: "Recruitment Projects - EOZ Employer Portal" },
      {
        name: "description",
        content: "Request and track an authorised EOZ-managed recruitment engagement.",
      },
    ],
  }),
  component: EmployerRecruitment,
});

function EmployerRecruitment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState("");
  const packagesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<ApiServicePackage[]>("/services"),
  });
  const packageItem = (packagesQuery.data ?? []).find(
    (service) => service.slug === "recruitment-support",
  );
  const ordersQuery = useQuery({
    queryKey: ["employer", "service-orders"],
    queryFn: () => api.get<ApiServiceOrder[]>("/services/orders/mine"),
    retry: false,
  });
  const orders = (ordersQuery.data ?? []).filter(
    (order) =>
      order.packageSlug === "recruitment-support" || /recruit|staffing/i.test(order.packageName),
  );
  const requestRecruitment = useMutation({
    mutationFn: () =>
      api.post<ApiServiceOrder>("/services/orders", {
        slug: packageItem?.slug ?? "recruitment-support",
        requirements: requirements.trim(),
      }),
    onSuccess: () => {
      setRequirements("");
      queryClient.invalidateQueries({ queryKey: ["employer", "service-orders"] });
      toast("Recruitment request submitted. EOZ will review the scope and prepare a quote.");
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : "Could not submit the recruitment request.",
        "error",
      ),
  });
  const acceptQuote = useMutation({
    mutationFn: (orderId: string) => api.post(`/services/orders/${orderId}/accept-quote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "service-orders"] });
      toast("Quote accepted. The invoice is now available under Invoices & payments.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not accept the quote.", "error"),
  });

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.8 ) - Recruitment"
        title="Managed hiring support, on request."
        lead="EOZ recruitment staff run shortlisting and interview coordination as a paid engagement. Candidate private notes remain visible only to authorised EOZ recruitment staff."
        aside={
          <Panel>
            <Link
              to="/employers/finance"
              className="accent-gradient inline-flex rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              View invoices
            </Link>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(ordersQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">
            Sign in as an employer to request recruitment support and track your engagements.
          </p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Panel>
            <div className="label-mono mb-3">Request recruitment support</div>
            <p className="text-sm text-muted">
              {packageItem?.description ??
                "Tell EOZ about the role, hiring volume, location and target timeline."}
            </p>
            <form
              className="mt-5 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                requestRecruitment.mutate();
              }}
            >
              <label className="text-sm text-muted" htmlFor="recruitment-requirements">
                Hiring brief
              </label>
              <textarea
                id="recruitment-requirements"
                required
                minLength={20}
                rows={6}
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
                placeholder="Role title, number of hires, location, target start date and the support you need"
                className="w-full rounded-md bg-surface-2 px-3 py-2.5 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/50"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-muted">
                  {packageItem?.turnaround ?? "Scope and turnaround agreed per engagement"}
                </span>
                <button
                  type="submit"
                  disabled={
                    requestRecruitment.isPending ||
                    requirements.trim().length < 20 ||
                    packagesQuery.isLoading
                  }
                  className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                >
                  {requestRecruitment.isPending ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </form>
          </Panel>

          <Panel>
            <div className="label-mono mb-3">Your recruitment engagements</div>
            {ordersQuery.isLoading ? (
              <p className="text-sm text-muted">Loading engagements...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted">No recruitment requests have been submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="border-t border-line pt-4 first:border-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg">{order.packageName}</h2>
                        <div className="mt-1 font-mono text-[10px] text-muted">
                          {order.reference} - Updated{" "}
                          {new Date(order.updatedAt).toLocaleDateString("en-ZM")}
                        </div>
                      </div>
                      <Chip tone={order.status === "COMPLETED" ? "emerald" : "amber"}>
                        {order.status.replace(/_/g, " ")}
                      </Chip>
                    </div>
                    {order.requirements ? (
                      <p className="mt-3 text-sm text-muted">{order.requirements}</p>
                    ) : null}
                    {order.status === "QUOTED" && order.latestQuoteAmount != null ? (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                        <span className="text-sm text-amber">
                          Quote: {order.latestQuoteCurrency}{" "}
                          {order.latestQuoteAmount.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          disabled={acceptQuote.isPending}
                          onClick={() => acceptQuote.mutate(order.id)}
                          className="accent-gradient rounded-md px-3 py-2 text-xs font-medium text-ink disabled:opacity-60"
                        >
                          Accept quote
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>
        <aside className="lg:col-span-4">
          <Panel>
            <div className="label-mono mb-3">How it works</div>
            <ol className="space-y-3 text-xs leading-5 text-muted">
              <li>1. Submit the hiring brief and target timeline.</li>
              <li>2. EOZ confirms scope, fee and the authorised client contact.</li>
              <li>3. A recruitment officer opens the project after the quote is accepted.</li>
            </ol>
          </Panel>
          <Panel className="mt-4">
            <div className="label-mono">Access boundary</div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Employer members see applicant records only when EOZ has granted project-specific
              access. Every view and export is logged.
            </p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
