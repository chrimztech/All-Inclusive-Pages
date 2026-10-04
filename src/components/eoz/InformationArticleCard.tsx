import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  FileCheck2,
  GraduationCap,
  Lightbulb,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Chip, Panel } from "@/components/eoz/SiteShell";
import type { ApiInformationArticle, InformationArticleCategory } from "@/lib/api-client";
import { articleDate, INFORMATION_CATEGORIES } from "@/lib/information-hub";

const ICONS: Record<InformationArticleCategory, LucideIcon> = {
  OPPORTUNITY_GUIDES: Lightbulb,
  APPLICATION_ADVICE: FileCheck2,
  CAREER_GROWTH: GraduationCap,
  WORKPLACE: BriefcaseBusiness,
  BUSINESS: Building2,
  TRUST_SAFETY: ShieldCheck,
};

export function InformationArticleCard({ article }: { article: ApiInformationArticle }) {
  const Icon = ICONS[article.category];
  const category = INFORMATION_CATEGORIES[article.category];

  return (
    <Link
      to="/information-hub/$slug"
      params={{ slug: article.slug }}
      className="group block h-full"
    >
      <Panel interactive className="flex h-full flex-col p-0">
        <div className="relative overflow-hidden rounded-t-2xl border-b border-line px-5 py-6">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(circle at 88% 12%, rgba(255,214,10,0.13), transparent 36%), radial-gradient(circle at 12% 100%, rgba(36,180,92,0.18), transparent 45%)",
            }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent-soft ring-1 ring-accent/20">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-soft"
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Chip>{category.shortLabel}</Chip>
            {article.featured ? <Chip tone="amber">Featured</Chip> : null}
          </div>
          <h2 className="text-balance font-display text-xl leading-tight tracking-tight transition-colors group-hover:text-accent-soft">
            {article.title}
          </h2>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{article.excerpt}</p>
          <div className="mt-auto flex items-center gap-2 pt-6 font-mono text-[10px] tracking-wide text-muted uppercase">
            <span>{articleDate(article.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{article.readingMinutes} min read</span>
          </div>
        </div>
      </Panel>
    </Link>
  );
}
