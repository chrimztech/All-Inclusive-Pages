import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Award, Eye, X } from "lucide-react";
import { SiteShell, Panel, PageIntro } from "@/components/eoz/SiteShell";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import { REGIONS } from "@/lib/eoz-data";
import {
  api,
  EMPLOYMENT_TYPE_LABELS,
  WORK_ARRANGEMENT_LABELS,
  type ApiCategory,
  type ApiOrganisation,
  type ApiOpportunitySummary,
  type EmploymentType,
  type PageResponse,
  type WorkArrangement,
} from "@/lib/api-client";

export const Route = createFileRoute("/opportunities/")({
  head: () => ({
    meta: [
      { title: "Opportunity Board — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Browse every verified job, internship, scholarship, grant, tender and training listing distributed by Echo Opportunities Zambia.",
      },
      { property: "og:title", content: "Opportunity Board — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content:
          "Filter opportunities across Zambia by category, region, deadline and verification.",
      },
    ],
  }),
  component: Board,
});

function Board() {
  const [category, setCategory] = useState("All");
  const [region, setRegion] = useState("All regions");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [workArrangement, setWorkArrangement] = useState("");
  const [recruiter, setRecruiter] = useState<ApiOrganisation | null>(null);

  const recruitersQuery = useQuery({
    queryKey: ["organisations", "top-recruiters"],
    queryFn: () =>
      api.get<PageResponse<ApiOrganisation>>("/organisations", { order: "top", size: 8 }),
  });
  const topRecruiters = (recruitersQuery.data?.items ?? []).filter((o) => o.listingsCount > 0);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<ApiCategory[]>("/categories"),
  });

  const opportunitiesQuery = useQuery({
    queryKey: [
      "opportunities",
      category,
      region,
      query,
      employmentType,
      workArrangement,
      sort,
      recruiter?.id,
    ],
    queryFn: () =>
      api.get<PageResponse<ApiOpportunitySummary>>("/opportunities", {
        category,
        region,
        q: query || undefined,
        employmentType: employmentType || undefined,
        workArrangement: workArrangement || undefined,
        organisationId: recruiter?.id,
        order: sort,
        size: 50,
      }),
  });

  const results = opportunitiesQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 03 ) — Opportunity Board"
        title="The full board, filtered your way."
        lead="Every listing carries its category, verification state, deadline and the employer's own application route."
      />

      <section className="grid gap-6 pb-12 lg:grid-cols-12">
        <aside className="self-start lg:sticky lg:top-24 lg:col-span-3">
          <Panel>
            <div className="label-mono mb-4">Refine</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title, organisation or reference"
              aria-label="Search the board"
              className="mb-4 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line"
            />
            <div className="label-mono mb-2">Category</div>
            <div className="mb-5 space-y-1">
              {["All", ...(categoriesQuery.data?.map((c) => c.name) ?? [])].map((c) => (
                <label key={c} className="flex items-center gap-2 py-0.5 text-sm">
                  <input
                    type="radio"
                    name="cat"
                    className="size-3.5"
                    checked={category === c}
                    onChange={() => setCategory(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
            <div className="label-mono mb-2">Region</div>
            <div className="mb-5 space-y-1">
              {["All regions", ...REGIONS].map((r) => (
                <label key={r} className="flex items-center gap-2 py-0.5 text-sm">
                  <input
                    type="radio"
                    name="reg"
                    className="size-3.5"
                    checked={region === r}
                    onChange={() => setRegion(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <div className="label-mono mb-2">Employment type</div>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="mb-5 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line"
            >
              <option value="">All</option>
              {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((key) => (
                <option key={key} value={key}>
                  {EMPLOYMENT_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
            <div className="label-mono mb-2">Work arrangement</div>
            <select
              value={workArrangement}
              onChange={(e) => setWorkArrangement(e.target.value)}
              className="w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line"
            >
              <option value="">All</option>
              {(Object.keys(WORK_ARRANGEMENT_LABELS) as WorkArrangement[]).map((key) => (
                <option key={key} value={key}>
                  {WORK_ARRANGEMENT_LABELS[key]}
                </option>
              ))}
            </select>
          </Panel>
        </aside>

        <div className="space-y-3 lg:col-span-9">
          {topRecruiters.length ? (
            <div className="glass rounded-2xl p-4 ring-1 ring-line">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium">
                <Award aria-hidden="true" className="size-4 text-amber" />
                Top recruiters
                <span className="font-normal text-muted">— most live listings</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {topRecruiters.map((org, i) => {
                  const active = recruiter?.id === org.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRecruiter(active ? null : org)}
                      className={`press inline-flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-xs transition-all ${
                        active
                          ? "accent-gradient font-semibold text-ink"
                          : "bg-white/[0.03] text-muted ring-1 ring-line hover:bg-white/[0.07] hover:text-fg"
                      }`}
                    >
                      <span
                        className={`flex size-5 items-center justify-center rounded-full font-mono text-[10px] ${active ? "bg-ink/15" : "bg-white/[0.06]"}`}
                      >
                        {i + 1}
                      </span>
                      {org.tradingName ?? org.legalName}
                      <span className={active ? "text-ink/70" : "text-muted"}>
                        {org.listingsCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-mono">
                {opportunitiesQuery.isLoading ? "Loading…" : `${results.length} results`}
              </span>
              {recruiter ? (
                <button
                  type="button"
                  onClick={() => setRecruiter(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent-soft ring-1 ring-accent/25 hover:text-fg"
                >
                  {recruiter.tradingName ?? recruiter.legalName}
                  <X aria-hidden="true" className="size-3" />
                  <span className="sr-only">Clear recruiter filter</span>
                </button>
              ) : null}
            </div>
            <div
              role="group"
              aria-label="Sort listings"
              className="inline-flex rounded-xl bg-white/[0.03] p-1 text-xs ring-1 ring-line"
            >
              {[
                { v: "newest", l: "Newest" },
                { v: "top", l: "Top listings" },
                { v: "closing", l: "Closing soon" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  aria-pressed={sort === o.v}
                  onClick={() => setSort(o.v)}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${sort === o.v ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg"}`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          {opportunitiesQuery.isError ? (
            <Panel>
              <p className="text-sm text-muted">
                We couldn't reach the opportunities service. Please try again shortly.
              </p>
            </Panel>
          ) : null}
          {!opportunitiesQuery.isLoading && results.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">No opportunities match these filters yet.</p>
            </Panel>
          ) : null}
          {results.map((item, i) => (
            <div key={item.id} className="relative">
              {sort === "top" && item.viewsCount > 0 ? (
                <span className="pointer-events-none absolute -top-2 left-5 z-10 inline-flex items-center gap-1 rounded-full bg-amber px-2 py-0.5 font-mono text-[10px] font-semibold text-ink shadow">
                  <Eye aria-hidden="true" className="size-3" />
                  {item.viewsCount.toLocaleString()} views
                </span>
              ) : null}
              <OpportunityCard item={item} delay={Math.min(i, 8) * 60} />
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
