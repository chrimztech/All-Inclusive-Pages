import { Link } from "@tanstack/react-router";
import { Chip } from "./SiteShell";
import type { Opportunity } from "@/lib/eoz-data";

export function deadlineTone(days: number) {
  if (days <= 3) return "rose" as const;
  if (days <= 10) return "amber" as const;
  return "accent" as const;
}

export function OpportunityCard({ item, delay = 0 }: { item: Opportunity; delay?: number }) {
  return (
    <Link
      to="/opportunities/$opportunityId"
      params={{ opportunityId: item.id }}
      className="glass group block rounded-xl p-5 ring-1 ring-line transition-all hover:ring-accent/40 fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Chip>{item.category.replace(/s$/, "")}</Chip>
            {item.verified ? (
              <Chip tone="emerald">Verified</Chip>
            ) : (
              <Chip tone="rose">Unverified</Chip>
            )}
            <Chip tone={deadlineTone(item.closesInDays)}>Closes in {item.closesInDays} days</Chip>
          </div>
          <h3 className="font-display text-xl tracking-tight">{item.title}</h3>
          <div className="mt-1 text-sm text-muted">
            {item.organisation} · {item.region} · {item.mode}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg">{item.value}</div>
          <div className="label-mono">{item.valueUnit}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted">
          Source: <span className="text-fg">{item.source}</span>
        </span>
        <span className="text-accent-soft transition-transform group-hover:translate-x-0.5">
          View details →
        </span>
      </div>
    </Link>
  );
}
