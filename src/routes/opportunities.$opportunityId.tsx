import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteShell, Panel, Chip } from "@/components/eoz/SiteShell";
import { OPPORTUNITIES, ORG, categoryOf } from "@/lib/eoz-data";
import { deadlineTone } from "@/components/eoz/OpportunityCard";

export const Route = createFileRoute("/opportunities/$opportunityId")({
  loader: ({ params }) => {
    const item = categoryOf(params.opportunityId);
    if (!item) throw notFound();
    return { item };
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
    const title = `${item.title} — ${item.organisation} | EOZ`;
    return {
      meta: [
        { title },
        { name: "description", content: item.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: item.summary },
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

function Detail() {
  const { item } = Route.useLoaderData();
  const related = OPPORTUNITIES.filter(
    (o) => o.category === item.category && o.id !== item.id,
  ).slice(0, 3);

  return (
    <SiteShell>
      <section className="grid gap-8 py-10 lg:grid-cols-12 lg:py-14">
        <div className="lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Chip>{item.category.replace(/s$/, "")}</Chip>
            {item.verified ? <Chip tone="emerald">Verified source</Chip> : <Chip tone="rose">Unverified</Chip>}
            <Chip tone={deadlineTone(item.closesInDays)}>Closes in {item.closesInDays} days</Chip>
            <span className="label-mono">Ref {item.reference}</span>
          </div>
          <h1 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
            {item.title}
          </h1>
          <p className="mt-3 text-muted">
            {item.organisation} · {item.region} · {item.mode} · Posted {item.postedAgo}
          </p>

          <p className="mt-8 max-w-[62ch] text-pretty text-lg text-muted">{item.summary}</p>

          <h2 className="mt-10 font-display text-2xl tracking-tight">Requirements</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {item.requirements.map((r) => (
              <li key={r} className="flex gap-3">
                <span className="text-accent-soft">—</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-display text-2xl tracking-tight">How to apply</h2>
          <Panel className="mt-4">
            <div className="label-mono mb-2">Official employer method</div>
            <p className="text-sm">{item.applyMethod}</p>
            <p className="mt-4 text-xs text-muted">{ORG.disclaimer}</p>
          </Panel>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono">Value</div>
            <div className="font-display text-3xl">{item.value}</div>
            <div className="text-xs text-muted">{item.valueUnit}</div>
            <div className="mt-5 space-y-2 text-sm">
              <Row label="Organisation" value={item.organisation} />
              <Row label="Region" value={item.region} />
              <Row label="Mode" value={item.mode} />
              <Row label="Source" value={item.source} />
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
                params={{ opportunityId: o.id }}
                className="glass rounded-xl p-4 ring-1 ring-line transition-colors hover:ring-accent/40"
              >
                <div className="label-mono">{o.organisation}</div>
                <div className="mt-1 font-display text-lg tracking-tight">{o.title}</div>
                <div className="mt-2 text-xs text-muted">Closes in {o.closesInDays} days</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </SiteShell>
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
