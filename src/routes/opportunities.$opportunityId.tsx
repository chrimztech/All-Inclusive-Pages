import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, Panel, Chip } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";
import { deadlineTone, SaveToggle } from "@/components/eoz/OpportunityCard";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  api,
  daysUntil,
  ApiError,
  type ApiOpportunityDetail,
  type PageResponse,
  type ApiOpportunitySummary,
} from "@/lib/api-client";

export const Route = createFileRoute("/opportunities/$opportunityId")({
  loader: async ({ params }) => {
    try {
      const item = await api.get<ApiOpportunityDetail>(`/opportunities/${params.opportunityId}`);
      return { item };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw notFound();
      }
      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Opportunity unavailable — Echo Opportunities Zambia" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { item } = loaderData;
    const title = `${item.title} — ${item.organisationName} | EOZ`;
    return {
      meta: [
        { title },
        { name: "description", content: item.description },
        { property: "og:title", content: title },
        { property: "og:description", content: item.description },
      ],
    };
  },
  component: Detail,
  notFoundComponent: OpportunityNotFound,
});

function OpportunityNotFound() {
  return (
    <SiteShell>
      <div className="py-24 text-center">
        <h1 className="font-display text-4xl tracking-tight">Listing unavailable</h1>
        <p className="mt-3 text-muted">This opportunity may have closed or been removed.</p>
        <Link to="/opportunities" className="mt-6 inline-block text-sm text-accent-soft">
          Back to the board →
        </Link>
      </div>
    </SiteShell>
  );
}

function applyMethodLabel(item: ApiOpportunityDetail) {
  switch (item.applicationMode) {
    case "EXTERNAL_URL":
      return `Employer's own application portal — ${item.applicationUrl}`;
    case "EMPLOYER_EMAIL":
      return `Email the employer directly — ${item.applicationEmail}`;
    case "PHYSICAL_ADDRESS":
      return item.applicationAddress ?? "Physical submission per the listing instructions.";
    case "EOZ_HOSTED":
      return "Apply directly through EOZ using the form below.";
    case "EOZ_INTERNAL_HIRING":
      return "This is an EOZ-managed hiring process.";
    default:
      return "Information only — no application route is currently open.";
  }
}

function Detail() {
  const { item } = Route.useLoaderData();
  const closesInDays = daysUntil(item.deadline) ?? 0;
  const { user } = useCurrentUser();
  const isCandidate = user?.roles.includes("CANDIDATE") ?? false;

  const relatedQuery = useQuery({
    queryKey: ["opportunities", "related", item.categoryCode],
    queryFn: () =>
      api.get<PageResponse<ApiOpportunitySummary>>("/opportunities", {
        category: item.categoryCode,
        size: 4,
      }),
  });
  const related = (relatedQuery.data?.items ?? []).filter((o) => o.id !== item.id).slice(0, 3);

  return (
    <SiteShell>
      <section className="grid gap-8 py-10 lg:grid-cols-12 lg:py-14">
        <div className="lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Chip>{item.categoryName.replace(/s$/, "")}</Chip>
            {item.verified ? <Chip tone="emerald">Verified source</Chip> : <Chip tone="rose">Unverified</Chip>}
            <Chip tone={deadlineTone(closesInDays)}>Closes in {closesInDays} days</Chip>
            <span className="label-mono">Ref {item.reference}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
              {item.title}
            </h1>
            {isCandidate ? (
              <SaveToggle opportunityId={item.id} className="relative shrink-0" />
            ) : null}
          </div>
          <p className="mt-3 text-muted">
            {item.organisationName}
            {item.region ? ` · ${item.region}` : ""}
            {item.workMode ? ` · ${item.workMode}` : ""}
          </p>

          <p className="mt-8 max-w-[62ch] text-pretty text-lg text-muted">{item.description}</p>

          {item.requirements ? (
            <>
              <h2 className="mt-10 font-display text-2xl tracking-tight">Requirements</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {item.requirements.split(";").map((r) => (
                  <li key={r} className="flex gap-3">
                    <span className="text-accent-soft">—</span>
                    <span>{r.trim()}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mt-10 font-display text-2xl tracking-tight">How to apply</h2>
          <Panel className="mt-4">
            <div className="label-mono mb-2">Official application route</div>
            <p className="text-sm">{applyMethodLabel(item)}</p>
            <p className="mt-4 text-xs text-muted">{ORG.disclaimer}</p>
            {item.applicationMode === "EOZ_HOSTED" ? <EozHostedApplyForm opportunityId={item.id} /> : null}
          </Panel>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono">Value</div>
            <div className="font-display text-3xl">{item.opportunityValue}</div>
            <div className="text-xs text-muted">{item.opportunityValueUnit}</div>
            <div className="mt-5 space-y-2 text-sm">
              <Row label="Organisation" value={item.organisationName} />
              <Row label="Region" value={item.region ?? "—"} />
              <Row label="Mode" value={item.workMode ?? "—"} />
              <Row label="Source" value={item.source ?? "—"} />
              <Row label="Reference" value={item.reference} />
            </div>
          </Panel>
          <Panel>
            <div className="label-mono mb-2">Need help applying?</div>
            <p className="text-sm text-muted">
              CV writing, cover letters and interview coaching from the EOZ services desk.
            </p>
            <Link to="/services" className="mt-3 inline-block text-sm text-accent-soft">
              View services →
            </Link>
          </Panel>
        </aside>
      </section>

      {related.length ? (
        <section className="pb-14">
          <h2 className="mb-4 font-display text-2xl tracking-tight">Similar opportunities</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {related.map((o) => (
              <Link
                key={o.id}
                to="/opportunities/$opportunityId"
                params={{ opportunityId: o.slug }}
                className="glass rounded-xl p-4 ring-1 ring-line transition-colors hover:ring-accent/40"
              >
                <div className="label-mono">{o.organisationName}</div>
                <div className="mt-1 font-display text-lg tracking-tight">{o.title}</div>
                <div className="mt-2 text-xs text-muted">Closes in {daysUntil(o.deadline) ?? 0} days</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}

function EozHostedApplyForm({ opportunityId }: { opportunityId: string }) {
  const [coverNote, setCoverNote] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post(`/opportunities/${opportunityId}/applications`, { coverNote }),
  });

  if (mutation.isSuccess) {
    return <p className="mt-4 text-sm text-emerald-400">Application submitted — track it from your dashboard.</p>;
  }

  return (
    <form
      className="mt-4 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <textarea
        value={coverNote}
        onChange={(e) => setCoverNote(e.target.value)}
        placeholder="Optional note to the hiring team"
        rows={3}
        className="w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
      >
        {mutation.isPending ? "Submitting…" : "Apply through EOZ"}
      </button>
      {mutation.isError ? (
        <p className="text-xs text-rose-400">
          {mutation.error instanceof ApiError ? mutation.error.message : "Sign in to apply."}
        </p>
      ) : null}
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-line pt-2">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
