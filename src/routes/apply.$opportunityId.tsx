import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Building2, MapPin } from "lucide-react";
import { SiteShell, Panel, Chip } from "@/components/eoz/SiteShell";
import { ApplyGate } from "@/components/eoz/ApplyGate";
import { DeadlineChip } from "@/components/eoz/OpportunityCard";
import { useCurrentUser } from "@/lib/use-current-user";
import { api, ApiError, type ApiOpportunityDetail } from "@/lib/api-client";

/** "View and Apply" for signed-out visitors: create an account or log in, then continue to the listing. */
export const Route = createFileRoute("/apply/$opportunityId")({
  loader: async ({ params }) => {
    try {
      const item = await api.get<ApiOpportunityDetail>(`/opportunities/${params.opportunityId}`);
      return { item };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Apply: ${loaderData.item.title} — Echo Opportunities Zambia`
          : "Apply — Echo Opportunities Zambia",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplyChoice,
  notFoundComponent: () => (
    <SiteShell>
      <div className="py-24 text-center">
        <h1 className="font-display text-4xl tracking-tight">Listing unavailable</h1>
        <p className="mt-3 text-muted">This opportunity may have closed or been removed.</p>
        <Link to="/opportunities" className="mt-6 inline-block text-sm text-accent-soft">
          Back to the board →
        </Link>
      </div>
    </SiteShell>
  ),
});

function ApplyChoice() {
  const { item } = Route.useLoaderData();
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  // Already signed in: nothing to choose, go straight to the listing.
  useEffect(() => {
    if (user) {
      navigate({
        to: "/opportunities/$opportunityId",
        params: { opportunityId: item.slug },
        replace: true,
      });
    }
  }, [user, item.slug, navigate]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl py-14 lg:py-20">
        <div className="eyebrow mb-4">View and Apply</div>
        <h1 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
          Create an account or log in to apply.
        </h1>
        <p className="mt-4 max-w-[56ch] text-muted">
          Once you're in, you'll see the full listing and how to apply, and you can save
          opportunities and track your applications.
        </p>

        <Panel className="mt-8">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Chip>{item.categoryName.replace(/s$/, "")}</Chip>
            <DeadlineChip deadline={item.deadline} />
          </div>
          <div className="font-display text-2xl leading-snug tracking-tight">{item.title}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 aria-hidden="true" className="size-3.5" />
              {item.organisationName}
            </span>
            {item.region ? (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {item.region}
              </span>
            ) : null}
          </div>
        </Panel>

        <div className="mt-6">
          <ApplyGate slug={item.slug} />
        </div>

        <Link to="/opportunities" className="mt-8 inline-block text-sm text-muted hover:text-fg">
          ← Back to the opportunity board
        </Link>
      </section>
    </SiteShell>
  );
}
