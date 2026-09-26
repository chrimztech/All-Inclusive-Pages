import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import { api, isUnauthenticated, type ApiOpportunitySummary } from "@/lib/api-client";
import { filterSaved } from "@/lib/saved-search";

export const Route = createFileRoute("/candidate/saved")({
  head: () => ({
    meta: [
      { title: "Saved Opportunities — EOZ Candidate Portal" },
      {
        name: "description",
        content:
          "Your shortlist of jobs, scholarships, grants and training saved for later action.",
      },
      { property: "og:title", content: "Saved Opportunities — EOZ Candidate Portal" },
      {
        property: "og:description",
        content: "Keep a shortlist of Zambian opportunities and act before the deadline.",
      },
    ],
  }),
  component: Saved,
});

function Saved() {
  const savedQuery = useQuery({
    queryKey: ["candidate", "saved"],
    queryFn: () => api.get<ApiOpportunitySummary[]>("/candidate/saved"),
    retry: false,
  });
  const [query, setQuery] = useState("");
  const saved = useMemo(() => savedQuery.data ?? [], [savedQuery.data]);
  const results = useMemo(() => filterSaved(saved, query), [saved, query]);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.2 ) — Saved"
        title="Your shortlist."
        lead="Saved listings stay here until they close. Deadlines are recalculated every day."
      />
      <DashNav items={CANDIDATE_NAV} />
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          {isUnauthenticated(savedQuery.error) ? (
            <Panel>
              <p className="text-sm text-muted">
                Sign in as a candidate to see your saved opportunities.
              </p>
            </Panel>
          ) : null}
          {saved.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative flex-1">
                <span className="sr-only">Search saved listings</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by reference, organisation or listing name"
                  className="w-full rounded-xl bg-white/[0.04] py-2.5 pr-9 pl-9 text-sm outline-none ring-1 ring-line transition-shadow placeholder:text-muted focus:ring-accent/50"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-fg"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                ) : null}
              </label>
              <span className="label-mono shrink-0" role="status">
                {query ? `${results.length} of ${saved.length}` : `${saved.length} saved`}
              </span>
            </div>
          ) : null}
          {savedQuery.data?.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">
                Nothing saved yet — browse the board and save a listing.
              </p>
            </Panel>
          ) : null}
          {saved.length > 0 && results.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">
                No saved listing matches “{query}”. Try a reference like EOZ-OPP-2026-000012, an
                organisation or part of the title.
              </p>
            </Panel>
          ) : null}
          {results.map((o, i) => (
            <OpportunityCard key={o.id} item={o} delay={Math.min(i, 8) * 60} />
          ))}
        </div>
        <aside className="lg:col-span-4">
          <Panel>
            <div className="label-mono mb-2">Deadline alerts</div>
            <p className="text-sm text-muted">
              Saved items closing within three days are highlighted in red across the portal.
            </p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}

