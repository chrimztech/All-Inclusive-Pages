import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { InformationArticleCard } from "@/components/eoz/InformationArticleCard";
import { Chip, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, ApiError, type ApiInformationArticle, type PageResponse } from "@/lib/api-client";
import { articleDate, INFORMATION_CATEGORIES } from "@/lib/information-hub";
import { safeHttpUrl } from "@/lib/safe-url";

export const Route = createFileRoute("/information-hub/$slug")({
  loader: async ({ params }) => {
    try {
      return {
        article: await api.get<ApiInformationArticle>(`/information-hub/${params.slug}`),
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Guide unavailable - EOZ Information Hub" }] };
    }
    const { article } = loaderData;
    return {
      meta: [
        { title: `${article.title} - EOZ Information Hub` },
        { name: "description", content: article.excerpt },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.excerpt },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: InformationArticleDetail,
  notFoundComponent: ArticleNotFound,
});

function ArticleNotFound() {
  return (
    <SiteShell>
      <div className="py-24 text-center">
        <BookOpen aria-hidden="true" className="mx-auto size-8 text-muted" />
        <h1 className="mt-5 font-display text-4xl tracking-tight">Guide unavailable</h1>
        <p className="mt-3 text-muted">This guide may still be a draft or may have been removed.</p>
        <Link to="/information-hub" className="btn-secondary mt-7 px-5 py-3 text-sm">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to the hub
        </Link>
      </div>
    </SiteShell>
  );
}

function InformationArticleDetail() {
  const { article } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);
  const category = INFORMATION_CATEGORIES[article.category];
  const sourceUrl = safeHttpUrl(article.sourceUrl);
  const paragraphs = article.body.split(/\n\s*\n/).filter(Boolean);

  const relatedQuery = useQuery({
    queryKey: ["information-hub", "related", article.category],
    queryFn: () =>
      api.get<PageResponse<ApiInformationArticle>>("/information-hub", {
        category: article.category,
        size: 4,
      }),
  });
  const related = (relatedQuery.data?.items ?? [])
    .filter((candidate) => candidate.id !== article.id)
    .slice(0, 3);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SiteShell>
      <article className="pb-14">
        <header className="relative py-12 sm:py-16 lg:py-20">
          <div
            aria-hidden="true"
            className="bg-grid pointer-events-none absolute inset-0 opacity-60"
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <Link
              to="/information-hub"
              className="mb-8 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-fg"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Information Hub
            </Link>
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              <Chip>{category.label}</Chip>
              {article.featured ? <Chip tone="amber">Featured guide</Chip> : null}
            </div>
            <h1 className="text-balance font-display text-4xl leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              {article.title}
            </h1>
            <p className="mx-auto mt-6 max-w-[62ch] text-pretty text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {article.excerpt}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 font-mono text-[10px] tracking-wide text-muted uppercase">
              <span>{articleDate(article.publishedAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{article.readingMinutes} min read</span>
              <span aria-hidden="true">·</span>
              <span>EOZ editorial</span>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <Panel className="p-4">
                <div className="label-mono">In this guide</div>
                <p className="mt-3 text-sm leading-6 text-muted">{category.description}</p>
                <button
                  type="button"
                  onClick={copyLink}
                  className="btn-secondary mt-5 w-full px-3 py-2 text-xs"
                >
                  {copied ? (
                    <Check aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Copy aria-hidden="true" className="size-3.5" />
                  )}
                  {copied ? "Link copied" : "Copy guide link"}
                </button>
              </Panel>
            </div>
          </aside>

          <div className="lg:col-span-8 lg:col-start-5">
            <div className="space-y-6 text-[15px] leading-8 text-[#c8d7ca] sm:text-base">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={`${index}-${paragraph.slice(0, 20)}`}
                  className={index === 0 ? "text-lg leading-8 text-fg" : ""}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {sourceUrl ? (
              <Panel className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="label-mono">Further reading</div>
                  <p className="mt-1 text-sm">{article.sourceName ?? sourceUrl.hostname}</p>
                </div>
                <a
                  href={sourceUrl.toString()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Open source
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </Panel>
            ) : null}

            <div className="mt-10 rounded-2xl bg-accent/[0.07] p-6 ring-1 ring-accent/20 sm:p-8">
              <div className="eyebrow">Put it into practice</div>
              <h2 className="mt-3 font-display text-2xl tracking-tight">
                Ready to find your next opportunity?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Browse verified listings and use what you have learned while the details are fresh.
              </p>
              <Link to="/opportunities" className="btn-primary mt-5 px-5 py-3 text-sm">
                Browse opportunities
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </article>

      {related.length ? (
        <section className="border-t border-line py-12" aria-labelledby="related-guides">
          <div className="eyebrow mb-2">Keep reading</div>
          <h2 id="related-guides" className="mb-6 font-display text-3xl tracking-tight">
            Related guides
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <InformationArticleCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}
