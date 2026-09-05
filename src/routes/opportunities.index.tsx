import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, Panel, PageIntro } from "@/components/eoz/SiteShell";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import { CATEGORIES, OPPORTUNITIES, REGIONS } from "@/lib/eoz-data";

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
        content: "Filter opportunities across Zambia by category, region, deadline and verification.",
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

  const results = useMemo(() => {
    const list = OPPORTUNITIES.filter((o) => {
      if (category !== "All" && o.category !== category) return false;
      if (region !== "All regions" && o.region !== region) return false;
      if (query && !`${o.title} ${o.organisation}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
    return sort === "deadline"
      ? [...list].sort((a, b) => a.closesInDays - b.closesInDays)
      : list;
  }, [category, region, sort, query]);

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
              placeholder="Search"
              aria-label="Search the board"
              className="mb-4 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line"
            />
            <div className="label-mono mb-2">Category</div>
            <div className="mb-5 space-y-1">
              {CATEGORIES.map((c) => (
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
            <div className="space-y-1">
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
          </Panel>
        </aside>

        <div className="space-y-3 lg:col-span-9">
          <div className="flex items-center justify-between text-sm">
            <div className="label-mono">{results.length} results</div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort"
              className="rounded-md bg-surface-2 px-3 py-1.5 text-xs outline-none ring-1 ring-line"
            >
              <option value="newest">Newest</option>
              <option value="deadline">Closing soonest</option>
            </select>
          </div>
          {results.map((item, i) => (
            <OpportunityCard key={item.id} item={item} delay={i * 60} />
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
