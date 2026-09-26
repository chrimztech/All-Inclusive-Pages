import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Lightbulb,
  MapPin,
  Megaphone,
  Rocket,
  Search,
  SearchCheck,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { SiteShell, Panel, Chip } from "@/components/eoz/SiteShell";
import { OpportunityCard } from "@/components/eoz/OpportunityCard";
import { CountUp, Reveal, trackSpotlight } from "@/components/eoz/Motion";
import { Monogram } from "@/components/eoz/Monogram";
import { APPLICATIONS, APPLICATION_STAGES, CATEGORIES, PILLARS, REGIONS } from "@/lib/eoz-data";
import { api, type ApiOpportunitySummary, type PageResponse } from "@/lib/api-client";
import { useOrgSettings } from "@/lib/use-org-settings";
import { useCountdown, formatCountdown, countdownTone } from "@/lib/use-countdown";

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

type PublicStats = {
  verifiedOrganisations: number;
  publishedListings: number;
  applicationsThisWeek: number;
  averageReviewHours: number | null;
};

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const CATEGORY_ICONS: Record<string, Icon> = {
  All: Compass,
  Jobs: Briefcase,
  Internships: GraduationCap,
  Scholarships: Award,
  "NGO Opportunities": HeartHandshake,
  Grants: HandCoins,
  Consultancies: Lightbulb,
  Tenders: FileText,
  Training: BookOpen,
  Events: CalendarDays,
  "Business Opportunities": Store,
};

const PILLAR_ICONS: Icon[] = [Briefcase, GraduationCap, TrendingUp, Rocket, Megaphone];

const STEPS = [
  {
    icon: SearchCheck,
    title: "Discover",
    body: "Browse curated jobs, scholarships, grants and tenders — every listing checked against its original source.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    body: "See who is hiring, the verification status and the exact closing date before you spend a minute applying.",
  },
  {
    icon: Send,
    title: "Apply direct",
    body: "Go straight to the employer's official channel. EOZ never sits between you and the decision-maker.",
  },
] as const;

function scrollToListings() {
  document.getElementById("listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Home() {
  const org = useOrgSettings();
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [region, setRegion] = useState("All regions");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [deadline, setDeadline] = useState("any");
  const [order, setOrder] = useState<"newest" | "top">("newest");

  const statsQuery = useQuery({
    queryKey: ["stats", "public"],
    queryFn: () => api.get<PublicStats>("/stats/public"),
  });

  const latestQuery = useQuery({
    queryKey: ["opportunities", "home", "latest"],
    queryFn: () =>
      api.get<PageResponse<ApiOpportunitySummary>>("/opportunities", {
        category: "All",
        region: "All regions",
        size: 3,
      }),
  });

  const opportunitiesQuery = useQuery({
    queryKey: ["opportunities", "home", category, region, query, verifiedOnly, deadline, order],
    queryFn: () =>
      api.get<PageResponse<ApiOpportunitySummary>>("/opportunities", {
        category,
        region,
        q: query || undefined,
        verifiedOnly: verifiedOnly ? "true" : undefined,
        deadlineWithinDays: deadline === "any" ? undefined : Number(deadline),
        order,
        size: 20,
      }),
  });
  const results = opportunitiesQuery.data?.items ?? [];
  const stats = statsQuery.data;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(draft.trim());
    scrollToListings();
  };

  const pickCategory = (c: string) => {
    setCategory(c);
    scrollToListings();
  };

  return (
    <SiteShell>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative -mx-5 px-5 pt-10 pb-16 lg:-mx-8 lg:px-8 lg:pt-20 lg:pb-24">
        <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -top-20" />
        <div className="relative grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-7">
            <div className="fade-in inline-flex items-center gap-2.5 rounded-full bg-white/[0.04] py-1.5 pr-4 pl-3 text-xs text-muted ring-1 ring-line backdrop-blur">
              <span className="live-dot" />
              <span>
                {stats ? (
                  <>
                    <span className="font-medium text-fg">
                      <CountUp value={stats.publishedListings} />
                    </span>{" "}
                    live opportunities across Zambia
                  </>
                ) : (
                  "Live, verified opportunities across Zambia"
                )}
              </span>
            </div>

            <h1
              className="fade-in mt-7 text-balance font-display text-[2.75rem] leading-[0.98] font-normal tracking-[-0.03em] sm:text-6xl lg:text-[5.25rem]"
              style={{ animationDelay: "80ms" }}
            >
              Every opportunity, <em className="text-gradient pr-1 font-light italic">verified</em>{" "}
              and within reach.
            </h1>

            <p
              className="fade-in mt-7 max-w-[54ch] text-pretty text-base leading-7 text-muted lg:text-lg lg:leading-8"
              style={{ animationDelay: "160ms" }}
            >
              Jobs, internships, scholarships, grants, tenders and training — curated for Zambian
              talent. We distribute. Employers hold the application route.
            </p>

            <form
              onSubmit={submitSearch}
              className="fade-in glass-strong group mt-9 flex flex-col gap-2 rounded-2xl p-2 ring-1 ring-line transition-shadow duration-300 focus-within:ring-accent/40 focus-within:shadow-[0_0_0_4px_rgba(124,227,164,0.08)] sm:flex-row sm:items-center"
              style={{ animationDelay: "240ms" }}
            >
              <label className="flex flex-1 items-center gap-3 px-3 py-2">
                <Search
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted transition-colors group-focus-within:text-accent-soft"
                />
                <span className="sr-only">Search opportunities</span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted/80"
                  placeholder="Role, employer or keyword — e.g. data analyst"
                />
              </label>
              <div className="flex gap-2">
                <label className="relative flex flex-1 items-center sm:flex-none">
                  <MapPin
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 size-4 text-muted"
                  />
                  <span className="sr-only">Region</span>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full appearance-none rounded-xl bg-white/[0.04] py-3 pr-4 pl-9 text-sm outline-none ring-1 ring-line transition-colors hover:bg-white/[0.07] sm:w-44"
                  >
                    <option>All regions</option>
                    {REGIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn-primary px-5 py-3 text-sm">
                  Search
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </form>

            <div
              className="fade-in mt-5 flex flex-wrap items-center gap-2 text-xs"
              style={{ animationDelay: "320ms" }}
            >
              <span className="mr-1 text-muted">Popular:</span>
              {["Jobs", "Internships", "Scholarships", "Grants"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pickCategory(c)}
                  className="rounded-full bg-white/[0.03] px-3 py-1.5 text-muted ring-1 ring-line transition-all hover:bg-white/[0.07] hover:text-fg hover:ring-accent/30"
                >
                  {c}
                </button>
              ))}
            </div>

            <ul
              className="fade-in mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted"
              style={{ animationDelay: "400ms" }}
            >
              {["Verified employers", "Apply on official channels", "Free for candidates"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 aria-hidden="true" className="size-4 text-accent-soft" />
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>

          <HeroBoard
            stats={stats}
            latest={latestQuery.data?.items ?? []}
            loading={latestQuery.isLoading}
          />
        </div>
      </section>

      {/* ─────────────────────── Category marquee ─────────────────────── */}
      <section
        aria-label="Browse by category"
        className="marquee-mask -mx-5 overflow-hidden py-2 lg:-mx-8"
      >
        <div className="marquee gap-3 pr-3">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-3" aria-hidden={copy === 1}>
              {CATEGORIES.filter((c) => c !== "All").map((c) => {
                const CatIcon = CATEGORY_ICONS[c] ?? Compass;
                return (
                  <button
                    key={c}
                    type="button"
                    tabIndex={copy === 1 ? -1 : 0}
                    onClick={() => pickCategory(c)}
                    className="group flex shrink-0 items-center gap-3 rounded-2xl bg-white/[0.025] py-3 pr-5 pl-3 ring-1 ring-line transition-all duration-300 hover:bg-white/[0.06] hover:ring-accent/30"
                  >
                    <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent-soft ring-1 ring-accent/20 transition-transform duration-300 group-hover:scale-110">
                      <CatIcon aria-hidden className="size-4" />
                    </span>
                    <span className="text-sm whitespace-nowrap">{c}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── How it works ─────────────────────── */}
      <section className="py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4">How EOZ works</div>
          <h2 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
            From discovery to application in{" "}
            <em className="text-gradient font-light italic">three</em> honest steps.
          </h2>
        </Reveal>
        <div className="relative mt-14 grid gap-4 md:grid-cols-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[3.25rem] right-[16%] left-[16%] hidden h-px md:block"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(124,227,164,0.35), rgba(255,214,10,0.35), transparent)",
            }}
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 120}>
              <div
                onMouseMove={trackSpotlight}
                className="spotlight glass relative h-full rounded-2xl p-7 text-center ring-1 ring-line"
              >
                <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-ink ring-1 ring-accent/30 shadow-[0_0_30px_-6px_rgba(36,180,92,0.6)]">
                  <step.icon aria-hidden className="size-6 text-accent-soft" />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full accent-gradient font-mono text-[10px] font-semibold text-ink">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl tracking-tight">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-[34ch] text-sm leading-6 text-muted">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────────── Listings ─────────────────────── */}
      <section id="listings" className="scroll-mt-24 border-t border-line pt-16 pb-8">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-3">Opportunity board</div>
            <h2 className="font-display text-4xl tracking-tight lg:text-5xl">
              {order === "top" ? "Most viewed right now." : "Fresh this week."}
            </h2>
          </div>
          <Link
            to="/opportunities"
            className="group inline-flex items-center gap-1.5 text-sm text-accent-soft"
          >
            Open the full board
            <ArrowUpRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </Reveal>

        <div className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {CATEGORIES.map((c) => {
            const active = c === category;
            const CatIcon = CATEGORY_ICONS[c] ?? Compass;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c)}
                className={`press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs transition-all duration-300 ${
                  active
                    ? "accent-gradient font-semibold text-ink shadow-[0_8px_24px_-10px_rgba(36,180,92,0.7)]"
                    : "bg-white/[0.02] text-muted ring-1 ring-line hover:bg-white/[0.06] hover:text-fg"
                }`}
              >
                <CatIcon aria-hidden className="size-3.5" />
                {c}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="self-start lg:sticky lg:top-24 lg:col-span-3">
            <Panel className="p-6">
              <div className="mb-5 flex items-center gap-2 text-sm font-medium">
                <SlidersHorizontal aria-hidden className="size-4 text-accent-soft" />
                Refine results
              </div>
              <div className="space-y-6 text-sm">
                <FilterGroup label="Region">
                  {["All regions", ...REGIONS].map((r) => (
                    <RadioRow
                      key={r}
                      name="region"
                      label={r}
                      checked={region === r}
                      onChange={() => setRegion(r)}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="Closing within">
                  {[
                    { v: "any", l: "Any time" },
                    { v: "7", l: "7 days" },
                    { v: "30", l: "30 days" },
                  ].map((d) => (
                    <RadioRow
                      key={d.v}
                      name="dl"
                      label={d.l}
                      checked={deadline === d.v}
                      onChange={() => setDeadline(d.v)}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup label="Employer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={verifiedOnly}
                    onClick={() => setVerifiedOnly((v) => !v)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex items-center gap-2">
                      <BadgeCheck aria-hidden className="size-4 text-emerald" />
                      Verified only
                    </span>
                    <span
                      className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${verifiedOnly ? "bg-accent" : "bg-white/10"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform duration-300 ${verifiedOnly ? "translate-x-4" : ""}`}
                      />
                    </span>
                  </button>
                </FilterGroup>
              </div>
            </Panel>
          </aside>

          <div className="space-y-3 lg:col-span-9">
            <div className="flex items-center justify-between gap-3 pb-1 text-sm">
              <div className="label-mono">
                {opportunitiesQuery.isLoading ? "Loading…" : `${results.length} results`}
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setDraft("");
                    }}
                    className="ml-3 normal-case tracking-normal text-accent-soft hover:text-fg"
                  >
                    “{query}” ✕
                  </button>
                ) : null}
              </div>
              <div
                role="group"
                aria-label="Sort listings"
                className="inline-flex shrink-0 rounded-xl bg-white/[0.03] p-1 text-xs ring-1 ring-line"
              >
                {(
                  [
                    { v: "newest", l: "Newest" },
                    { v: "top", l: "Top listings" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    aria-pressed={order === o.v}
                    onClick={() => setOrder(o.v)}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${order === o.v ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              <div className="hidden items-center gap-1.5 text-xs text-muted xl:flex">
                <ShieldCheck aria-hidden className="size-3.5 text-accent-soft" />
                Apply direct with the employer
              </div>
            </div>
            {opportunitiesQuery.isLoading
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="skeleton h-[132px] rounded-2xl ring-1 ring-line" />
                ))
              : results.map((item, i) => (
                  <OpportunityCard key={item.id} item={item} delay={Math.min(i, 8) * 60} />
                ))}
            {!opportunitiesQuery.isLoading && results.length === 0 ? (
              <Panel className="flex flex-col items-center py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-line">
                  <Search aria-hidden className="size-5 text-muted" />
                </span>
                <p className="mt-4 font-display text-xl">Nothing matches — yet.</p>
                <p className="mt-1 max-w-[40ch] text-sm text-muted">
                  Try widening the region or deadline, or clear your search to see everything.
                </p>
              </Panel>
            ) : null}
            <div className="pt-4 text-center">
              <Link to="/opportunities" className="btn-secondary px-6 py-3 text-sm">
                Open the full opportunity board
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── Candidate portal preview ─────────────────────── */}
      <section className="py-20">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10 sm:p-10 lg:p-12"
            style={{
              background:
                "radial-gradient(700px 400px at 100% 0%, rgba(255,214,10,0.10), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(36,180,92,0.18), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            }}
          >
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <div className="eyebrow mb-4">Candidate portal</div>
                <h2 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
                  Applications tracked. Deadlines watched.
                </h2>
                <p className="mt-5 max-w-[44ch] text-pretty text-muted">
                  Every submission logged against the employer's official channel, with a status
                  timeline from draft to decision. Example view — sign in to see your own.
                </p>
                <div className="mt-8 grid max-w-sm grid-cols-3 gap-6">
                  {[
                    { v: "8", l: "Active" },
                    { v: "3", l: "Shortlisted" },
                    { v: "2", l: "Closing ≤ 7d", tone: "text-amber" },
                  ].map((s) => (
                    <div key={s.l}>
                      <div className={`font-display text-4xl ${s.tone ?? ""}`}>{s.v}</div>
                      <div className="label-mono mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
                <Link to="/candidate" className="btn-secondary mt-9 px-5 py-3 text-sm">
                  Open candidate portal
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>

              <div className="lg:col-span-7">
                <div className="glass-strong rounded-2xl p-6 ring-1 ring-line">
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Monogram name={APPLICATIONS[0]!.organisation} />
                      <div>
                        <div className="label-mono mb-1">{APPLICATIONS[0]!.organisation}</div>
                        <div className="font-display text-xl">{APPLICATIONS[0]!.role}</div>
                      </div>
                    </div>
                    <Chip tone="amber">{APPLICATIONS[0]!.status}</Chip>
                  </div>
                  <ol className="relative grid grid-cols-5">
                    <div
                      aria-hidden
                      className="absolute top-[7px] right-[10%] left-[10%] h-px bg-line"
                    />
                    <div
                      aria-hidden
                      className="accent-gradient absolute top-[7px] left-[10%] h-px"
                      style={{
                        width: `${(APPLICATIONS[0]!.stage / (APPLICATION_STAGES.length - 1)) * 80}%`,
                      }}
                    />
                    {APPLICATION_STAGES.map((s, i) => {
                      const stage = APPLICATIONS[0]!.stage;
                      const done = i < stage;
                      const current = i === stage;
                      return (
                        <li key={s} className="relative flex flex-col items-center gap-3">
                          <span
                            className={`relative size-3.5 rounded-full ring-4 ring-ink ${
                              done ? "bg-accent-soft" : current ? "bg-amber" : "bg-white/15"
                            }`}
                            style={
                              done || current
                                ? {
                                    boxShadow: `0 0 14px 2px ${current ? "rgba(255,214,10,0.5)" : "rgba(124,227,164,0.45)"}`,
                                  }
                                : undefined
                            }
                          />
                          <span
                            className={`text-center font-mono text-[10px] ${current ? "text-amber" : done ? "text-fg" : "text-muted"}`}
                          >
                            {s}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { l: "Saved", v: "14" },
                    { l: "CVs", v: "2" },
                    { l: "Alerts", v: "6" },
                  ].map((s) => (
                    <div key={s.l} className="glass rounded-xl p-4 ring-1 ring-line">
                      <div className="label-mono">{s.l}</div>
                      <div className="mt-1 font-display text-2xl">{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─────────────────────── Pillars bento ─────────────────────── */}
      <section className="py-12">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="eyebrow mb-4">What EOZ connects</div>
            <h2 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
              Opportunity access, with practical support behind it.
            </h2>
          </div>
          <Link
            to="/about"
            className="group inline-flex items-center gap-1.5 text-sm text-accent-soft"
          >
            Our story and values
            <ArrowUpRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-6">
          {PILLARS.map((pillar, i) => {
            const PillarIcon = PILLAR_ICONS[i] ?? Compass;
            const featured = i === 0;
            return (
              <Reveal
                key={pillar.title}
                delay={i * 80}
                className={featured ? "md:col-span-3 md:row-span-2" : "md:col-span-3"}
              >
                <div
                  onMouseMove={trackSpotlight}
                  className={`spotlight ring-gradient glass hover-lift relative flex h-full flex-col overflow-hidden rounded-2xl p-7 ring-1 ring-line ${featured ? "min-h-[20rem] justify-end" : ""}`}
                >
                  {featured ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-60 blur-3xl"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(255,214,10,0.35), rgba(36,180,92,0.2) 50%, transparent 70%)",
                      }}
                    />
                  ) : null}
                  <span
                    className={`relative flex items-center justify-center rounded-xl ring-1 ${
                      featured
                        ? "mb-auto size-14 bg-accent/15 text-accent-soft ring-accent/30"
                        : "mb-5 size-11 bg-white/5 text-accent-soft ring-line"
                    }`}
                  >
                    <PillarIcon aria-hidden className={featured ? "size-6" : "size-5"} />
                  </span>
                  <h3
                    className={`relative font-display leading-tight tracking-tight ${featured ? "mt-10 text-3xl lg:text-4xl" : "text-xl"}`}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    className={`relative mt-3 leading-6 text-muted ${featured ? "max-w-[40ch] text-base" : "text-sm"}`}
                  >
                    {pillar.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────── Explore ─────────────────────── */}
      <section className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              to: "/services",
              t: "Professional services",
              d: "CVs, cover letters, coaching and business profiles.",
              icon: FileText,
            },
            {
              to: "/employers",
              t: "For employers",
              d: "Publish verified vacancies and manage recruitment.",
              icon: Users,
            },
            {
              to: "/content",
              t: "Content & channels",
              d: "Opportunity updates, career guidance and professional content.",
              icon: Megaphone,
            },
            { to: "/about", t: "About EOZ", d: org.tagline, icon: Compass },
          ].map((c, i) => (
            <Reveal key={c.to} delay={i * 80}>
              <Link
                to={c.to}
                onMouseMove={trackSpotlight}
                className="spotlight ring-gradient glass group flex h-full flex-col rounded-2xl p-6 ring-1 ring-line transition-transform duration-500 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-line">
                    <c.icon aria-hidden className="size-4 text-accent-soft" />
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-soft"
                  />
                </div>
                <div className="mt-6 font-display text-xl">{c.t}</div>
                <p className="mt-2 text-sm leading-6 text-muted">{c.d}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}

function HeroBoard({
  stats,
  latest,
  loading,
}: {
  stats: PublicStats | undefined;
  latest: ApiOpportunitySummary[];
  loading: boolean;
}) {
  return (
    <div className="fade-in relative sm:py-9 lg:col-span-5" style={{ animationDelay: "300ms" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(36,180,92,0.30), rgba(255,214,10,0.10), transparent)",
        }}
      />

      <div className="glass-strong relative overflow-hidden rounded-3xl ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="live-dot" />
            Live feed
          </div>
          <span className="label-mono">Updated continuously</span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {[
            { l: "Active", v: stats?.publishedListings },
            { l: "Verified orgs", v: stats?.verifiedOrganisations },
            { l: "Applied / wk", v: stats?.applicationsThisWeek },
          ].map((s) => (
            <div key={s.l} className="px-4 py-5">
              <div className="font-display text-3xl tracking-tight">
                <CountUp value={s.v} />
              </div>
              <div className="label-mono mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        <ul className="divide-y divide-line">
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-4">
                  <div className="skeleton size-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-3/4 rounded" />
                    <div className="skeleton h-2.5 w-1/2 rounded" />
                  </div>
                </li>
              ))
            : latest.map((item) => <HeroFeedRow key={item.id} item={item} />)}
          {!loading && latest.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted">
              New listings appear here the moment they're published.
            </li>
          ) : null}
        </ul>
      </div>

      <div
        className="float glass-strong absolute top-0 left-6 z-10 hidden items-center gap-2.5 rounded-2xl px-4 py-3 ring-1 ring-white/10 sm:flex"
        style={{ backgroundColor: "rgba(8,29,18,0.85)" }}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-emerald/15 ring-1 ring-emerald/30">
          <BadgeCheck aria-hidden className="size-4 text-emerald" />
        </span>
        <div className="leading-tight">
          <div className="text-xs font-medium">Source-verified</div>
          <div className="label-mono !text-[9px]">Every listing</div>
        </div>
      </div>

      <div
        className="float glass-strong absolute right-6 bottom-0 z-10 hidden items-center gap-2.5 rounded-2xl px-4 py-3 ring-1 ring-white/10 sm:flex"
        style={{ animationDelay: "-3.5s", backgroundColor: "rgba(8,29,18,0.85)" }}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-amber/15 ring-1 ring-amber/30">
          <Clock aria-hidden className="size-4 text-amber" />
        </span>
        <div className="leading-tight">
          <div className="text-xs font-medium">Live deadlines</div>
          <div className="label-mono !text-[9px]">Counted to the second</div>
        </div>
      </div>
    </div>
  );
}

function HeroFeedRow({ item }: { item: ApiOpportunitySummary }) {
  const countdown = useCountdown(item.deadline, 60_000);
  return (
    <li>
      <Link
        to="/opportunities/$opportunityId"
        params={{ opportunityId: item.slug }}
        className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03]"
      >
        <Monogram name={item.organisationName} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium transition-colors group-hover:text-accent-soft">
            {item.title}
          </div>
          <div className="truncate text-xs text-muted">
            {item.organisationName}
            {item.region ? ` · ${item.region}` : ""}
          </div>
        </div>
        <Chip tone={countdownTone(countdown)}>{formatCountdown(countdown)}</Chip>
      </Link>
    </li>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="label-mono mb-2">{label}</legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  );
}

function RadioRow({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04] ${checked ? "text-fg" : "text-muted"}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={`flex size-4 items-center justify-center rounded-full ring-1 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-accent-soft ${
          checked ? "bg-accent/20 ring-accent-soft" : "ring-white/20"
        }`}
      >
        <span
          className={`size-1.5 rounded-full bg-accent-soft transition-transform ${checked ? "scale-100" : "scale-0"}`}
        />
      </span>
      {label}
    </label>
  );
}
