import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, Panel, PageIntro } from "@/components/eoz/SiteShell";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import {
  APPLICATIONS,
  APPLICATION_STAGES,
  CATEGORIES,
  OPPORTUNITIES,
  ORG,
  REGIONS,
} from "@/lib/eoz-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Echo Opportunities Zambia — Verified Jobs, Scholarships & Grants" },
      {
        name: "description",
        content:
          "Discover verified jobs, internships, scholarships, grants, tenders and training for Zambian talent. Apply directly with employers through their official channel.",
      },
      { property: "og:title", content: "Echo Opportunities Zambia — Verified Opportunities" },
      {
        property: "og:description",
        content:
          "Connecting Talent. Creating Opportunities. Building Futures. Curated opportunities across Zambia.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All regions");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [deadline, setDeadline] = useState("any");

  const results = useMemo(() => {
    return OPPORTUNITIES.filter((o) => {
      if (category !== "All" && o.category !== category) return false;
      if (region !== "All regions" && o.region !== region) return false;
      if (verifiedOnly && !o.verified) return false;
      if (deadline === "7" && o.closesInDays > 7) return false;
      if (deadline === "30" && o.closesInDays > 30) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !o.title.toLowerCase().includes(q) &&
          !o.organisation.toLowerCase().includes(q) &&
          !o.region.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [category, query, region, verifiedOnly, deadline]);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 01 ) — Connect Talent · Create Opportunity"
        title={
          <>
            Every opportunity,
            <br className="hidden lg:block" />{" "}
            <em className="font-light italic text-accent-soft">verified</em> and within reach.
          </>
        }
        lead="Jobs, internships, scholarships, grants, tenders and training — curated for Zambian talent. We distribute. Employers hold the application route."
        aside={
          <Panel>
            <div className="label-mono mb-3">Live feed</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span>Active opportunities</span>
                <span className="font-mono text-accent-soft">1,247</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span>Verified employers</span>
                <span className="font-mono text-accent-soft">318</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span>Applications this week</span>
                <span className="font-mono text-accent-soft">4,892</span>
              </div>
            </div>
          </Panel>
        }
      />

      <section className="py-4">
        <div className="glass-strong flex flex-col gap-2 rounded-xl p-3 ring-1 ring-line md:flex-row">
          <div className="flex flex-1 items-center gap-2 px-3 py-2">
            <span className="text-muted">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              placeholder="Search roles, employers, locations — e.g. data analyst Lusaka"
              aria-label="Search opportunities"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Region"
              className="rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line"
            >
              <option>All regions</option>
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <Link
              to="/opportunities"
              className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Browse all
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={
                c === category
                  ? "accent-gradient rounded-full px-3 py-1.5 text-xs font-medium text-ink"
                  : "rounded-full px-3 py-1.5 text-xs text-muted ring-1 ring-line transition-colors hover:text-fg"
              }
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 py-6 lg:grid-cols-12">
        <aside className="fade-in self-start lg:sticky lg:top-24 lg:col-span-3">
          <Panel>
            <div className="label-mono mb-4">Filters</div>
            <div className="space-y-5 text-sm">
              <div>
                <div className="label-mono mb-2">Region</div>
                {["All regions", ...REGIONS].map((r) => (
                  <label key={r} className="flex items-center gap-2 py-1">
                    <input
                      type="radio"
                      name="region"
                      className="size-3.5"
                      checked={region === r}
                      onChange={() => setRegion(r)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              <div>
                <div className="label-mono mb-2">Deadline</div>
                {[
                  { v: "any", l: "Any" },
                  { v: "7", l: "7 days" },
                  { v: "30", l: "30 days" },
                ].map((d) => (
                  <label key={d.v} className="flex items-center gap-2 py-1">
                    <input
                      type="radio"
                      name="dl"
                      className="size-3.5"
                      checked={deadline === d.v}
                      onChange={() => setDeadline(d.v)}
                    />
                    <span>{d.l}</span>
                  </label>
                ))}
              </div>
              <div>
                <div className="label-mono mb-2">Employer</div>
                <label className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                  />
                  <span>Verified only</span>
                </label>
              </div>
            </div>
          </Panel>
        </aside>

        <div className="space-y-3 lg:col-span-9">
          <div className="flex items-center justify-between text-sm">
            <div className="label-mono">{results.length} results · Sorted by newest</div>
            <div className="hidden text-muted sm:block">
              Apply direct with employer — EOZ distributes only.
            </div>
          </div>
          {results.map((item, i) => (
            <OpportunityCard key={item.id} item={item} delay={i * 80} />
          ))}
          {results.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">
                No opportunities match these filters yet. Try widening the region or deadline.
              </p>
            </Panel>
          ) : null}
          <div className="pt-2 text-center">
            <Link
              to="/opportunities"
              className="inline-block rounded-md px-6 py-3 text-sm text-muted ring-1 ring-line transition-colors hover:text-fg"
            >
              Open the full opportunity board
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div
          className="fade-in rounded-2xl p-6 ring-1 ring-line backdrop-blur-md lg:p-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(196,181,253,0.08), rgba(255,255,255,0.01))",
          }}
        >
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="eyebrow mb-3">( 02 ) — Your Candidate Portal</div>
              <h2 className="font-display text-3xl leading-tight tracking-tight lg:text-4xl">
                Applications tracked, deadlines watched.
              </h2>
              <p className="mt-3 max-w-[40ch] text-pretty text-sm text-muted">
                Every submission logged with the employer's official channel. Status timeline from
                draft to shortlist.
              </p>
              <div className="mt-5 flex gap-4">
                <div>
                  <div className="font-display text-2xl">8</div>
                  <div className="label-mono">Active</div>
                </div>
                <div>
                  <div className="font-display text-2xl">3</div>
                  <div className="label-mono">Shortlisted</div>
                </div>
                <div>
                  <div className="font-display text-2xl text-amber">2</div>
                  <div className="label-mono">Closing ≤ 7d</div>
                </div>
              </div>
              <Link
                to="/candidate"
                className="mt-6 inline-block rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
              >
                Open candidate portal →
              </Link>
            </div>
            <div className="lg:col-span-8">
              <div
                className="rounded-xl p-5 ring-1 ring-line"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="label-mono mb-1">
                      Application · {APPLICATIONS[0]!.organisation}
                    </div>
                    <div className="font-display text-lg">{APPLICATIONS[0]!.role}</div>
                  </div>
                  <span className="rounded bg-amber/10 px-2 py-0.5 font-mono text-[10px] text-amber ring-1 ring-amber/30">
                    {APPLICATIONS[0]!.status}
                  </span>
                </div>
                <div className="flex items-center">
                  {APPLICATION_STAGES.map((_, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center">
                      <div
                        className={`size-2.5 rounded-full ${
                          i < APPLICATIONS[0]!.stage
                            ? "bg-accent-soft"
                            : i === APPLICATIONS[0]!.stage
                              ? "bg-amber"
                              : "bg-line"
                        }`}
                        style={
                          i <= APPLICATIONS[0]!.stage
                            ? { boxShadow: "0 0 12px 2px rgba(196,181,253,0.4)" }
                            : undefined
                        }
                      />
                      <div className="mt-0 h-px w-full bg-line" />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
                  {APPLICATION_STAGES.map((s, i) => (
                    <span key={s} className={i === APPLICATIONS[0]!.stage ? "text-amber" : ""}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { l: "Saved", v: "14" },
                  { l: "CVs", v: "2" },
                  { l: "Alerts", v: "6" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-lg p-3 ring-1 ring-line"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="label-mono">{s.l}</div>
                    <div className="mt-1 font-display text-xl">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/services", t: "Professional services", d: "CVs, cover letters, coaching and business profiles." },
            { to: "/employers", t: "For employers", d: "Publish verified vacancies and manage recruitment." },
            { to: "/about", t: "About EOZ", d: `${ORG.tagline}` },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="glass rounded-xl p-5 ring-1 ring-line hover:ring-accent/40">
              <div className="font-display text-lg">{c.t}</div>
              <p className="mt-2 text-sm text-muted">{c.d}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
