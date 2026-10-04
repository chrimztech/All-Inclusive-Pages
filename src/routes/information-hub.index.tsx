import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Search, Sparkles, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { InformationArticleCard } from "@/components/eoz/InformationArticleCard";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import {
  api,
  type ApiInformationArticle,
  type InformationArticleCategory,
  type PageResponse,
} from "@/lib/api-client";
import {
  INFORMATION_CATEGORIES,
  INFORMATION_CATEGORY_KEYS,
  articleDate,
} from "@/lib/information-hub";

export const Route = createFileRoute("/information-hub/")({
  head: () => ({
    meta: [
      { title: "Information Hub - Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Practical Zambian career guidance, application advice, workplace knowledge, business resources and opportunity safety tips from EOZ.",
      },
      { property: "og:title", content: "Information Hub - Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Clear, useful guidance for finding opportunities and making your next move.",
      },
    ],
  }),
  component: InformationHub,
});

function InformationHub() {
  const [category, setCategory] = useState<InformationArticleCategory | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const articlesQuery = useQuery({
    queryKey: ["information-hub", category, search],
    queryFn: () =>
      api.get<PageResponse<ApiInformationArticle>>("/information-hub", {
        category: category || undefined,
        q: search || undefined,
        size: 60,
      }),
  });

  const items = articlesQuery.data?.items ?? [];
  const featured = !category && !search ? items.find((article) => article.featured) : undefined;
  const articles = featured ? items.filter((article) => article.id !== featured.id) : items;
  const isFiltered = Boolean(category || search);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setCategory("");
    setSearch("");
    setSearchInput("");
  };

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 12 ) - Information Hub"
        title={
          <>
            Practical knowledge for your{" "}
            <em className="text-gradient font-light italic">next move.</em>
          </>
        }
        lead="Straightforward guides for finding opportunities, applying with confidence, growing at work and protecting yourself along the way."
        aside={
          <Panel className="relative overflow-hidden">
            <div className="absolute -top-12 -right-10 size-32 rounded-full bg-amber/10 blur-3xl" />
            <Sparkles aria-hidden="true" className="size-5 text-amber" />
            <div className="mt-4 font-display text-xl">Clear. Local. Useful.</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Built for real questions from candidates, professionals, founders and employers in
              Zambia.
            </p>
          </Panel>
        }
      />

      <section aria-label="Find a guide" className="pb-8">
        <Panel className="p-3 sm:p-4">
          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search the Information Hub</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search guides, topics and advice"
                className="w-full rounded-xl bg-surface-2 py-3 pr-10 pl-10 text-sm outline-none ring-1 ring-line transition-shadow focus:ring-accent/40"
              />
              {searchInput ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                  }}
                  className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center text-muted hover:text-fg"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </label>
            <button type="submit" className="btn-primary px-6 py-3 text-sm">
              Search hub
            </button>
          </form>
        </Panel>
      </section>

      <section aria-labelledby="topics-heading" className="pb-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">Browse by topic</div>
            <h2 id="topics-heading" className="font-display text-2xl tracking-tight">
              Start where you are
            </h2>
          </div>
          {isFiltered ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-accent-soft hover:text-fg"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {INFORMATION_CATEGORY_KEYS.map((key) => {
            const item = INFORMATION_CATEGORIES[key];
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(active ? "" : key)}
                className={`rounded-xl p-4 text-left ring-1 transition-all duration-300 ${
                  active
                    ? "bg-accent/12 ring-accent/40"
                    : "bg-white/[0.025] ring-line hover:bg-white/[0.05] hover:ring-accent/25"
                }`}
              >
                <span className={`text-sm font-medium ${active ? "text-accent-soft" : "text-fg"}`}>
                  {item.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {articlesQuery.isLoading ? (
        <section
          className="grid gap-4 pb-14 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Loading guides"
        >
          {[0, 1, 2].map((key) => (
            <div key={key} className="skeleton h-80 rounded-2xl" />
          ))}
        </section>
      ) : null}

      {articlesQuery.isError ? (
        <Panel className="mb-14 py-10 text-center">
          <BookOpen aria-hidden="true" className="mx-auto size-6 text-muted" />
          <h2 className="mt-3 font-display text-xl">The hub could not load</h2>
          <p className="mt-2 text-sm text-muted">Please check your connection and try again.</p>
          <button
            type="button"
            onClick={() => articlesQuery.refetch()}
            className="btn-secondary mt-5 px-4 py-2 text-sm"
          >
            Try again
          </button>
        </Panel>
      ) : null}

      {featured ? (
        <section className="pb-10" aria-labelledby="featured-guide">
          <Link
            to="/information-hub/$slug"
            params={{ slug: featured.slug }}
            className="group block overflow-hidden rounded-3xl ring-1 ring-white/10"
          >
            <div
              className="relative grid min-h-[360px] gap-8 overflow-hidden p-7 sm:p-10 lg:grid-cols-12 lg:items-end lg:p-12"
              style={{
                background:
                  "radial-gradient(700px 380px at 90% 5%, rgba(255,214,10,0.20), transparent 60%), radial-gradient(700px 420px at 0% 100%, rgba(36,180,92,0.30), transparent 65%), linear-gradient(135deg, #0d2c1b, #091f14)",
              }}
            >
              <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-70" />
              <div className="relative lg:col-span-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <Chip tone="amber">Featured guide</Chip>
                  <Chip>{INFORMATION_CATEGORIES[featured.category].label}</Chip>
                </div>
                <h2
                  id="featured-guide"
                  className="text-balance font-display text-3xl leading-tight tracking-tight sm:text-4xl lg:text-5xl"
                >
                  {featured.title}
                </h2>
                <p className="mt-5 max-w-[60ch] text-sm leading-7 text-muted sm:text-base">
                  {featured.excerpt}
                </p>
              </div>
              <div className="relative lg:col-span-4 lg:text-right">
                <div className="font-mono text-[10px] tracking-wide text-muted uppercase">
                  {articleDate(featured.publishedAt)} · {featured.readingMinutes} min read
                </div>
                <span className="btn-primary mt-5 px-5 py-3 text-sm">
                  Read the guide
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      {articlesQuery.isSuccess ? (
        <section className="pb-14" aria-labelledby="latest-guides">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="eyebrow mb-2">
                {isFiltered ? "Your results" : "Explore the library"}
              </div>
              <h2 id="latest-guides" className="font-display text-2xl tracking-tight sm:text-3xl">
                {isFiltered
                  ? `${items.length} guide${items.length === 1 ? "" : "s"} found`
                  : "More useful reads"}
              </h2>
            </div>
            {category ? <Chip>{INFORMATION_CATEGORIES[category].label}</Chip> : null}
          </div>
          {items.length === 0 ? (
            <Panel className="py-12 text-center">
              <BookOpen aria-hidden="true" className="mx-auto size-7 text-muted" />
              <h3 className="mt-4 font-display text-xl">No guides match that search</h3>
              <p className="mt-2 text-sm text-muted">
                Try a broader phrase or choose another topic.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary mt-5 px-4 py-2 text-sm"
              >
                Show every guide
              </button>
            </Panel>
          ) : articles.length === 0 ? (
            <p className="text-sm text-muted">More guides are on the way.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <InformationArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </SiteShell>
  );
}
