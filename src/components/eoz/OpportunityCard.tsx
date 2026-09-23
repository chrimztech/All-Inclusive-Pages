import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Chip } from "./SiteShell";
import {
  api,
  ApiError,
  EMPLOYMENT_TYPE_LABELS,
  WORK_ARRANGEMENT_LABELS,
  type ApiOpportunitySummary,
} from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { useToast } from "@/lib/toast";
import { useCountdown, formatCountdown, countdownTone } from "@/lib/use-countdown";

export function DeadlineChip({
  deadline,
  intervalMs,
}: {
  deadline: string | null;
  intervalMs?: number;
}) {
  const countdown = useCountdown(deadline, intervalMs);
  return <Chip tone={countdownTone(countdown)}>{formatCountdown(countdown)}</Chip>;
}

export function OpportunityCard({
  item,
  delay = 0,
}: {
  item: ApiOpportunitySummary;
  delay?: number;
}) {
  const countdown = useCountdown(item.deadline);
  const { user } = useCurrentUser();
  const isCandidate = user?.roles.includes("CANDIDATE") ?? false;

  return (
    <div
      className={`hover-lift glass group relative overflow-hidden rounded-xl p-5 ring-1 ring-line transition-colors fade-in hover:ring-accent/40 ${countdown.expired ? "opacity-60" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px scale-x-0 accent-gradient transition-transform duration-500 group-hover:scale-x-100" />
      {isCandidate ? <SaveToggle opportunityId={item.id} /> : null}
      <Link
        to="/opportunities/$opportunityId"
        params={{ opportunityId: item.slug }}
        className="block"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Chip>{item.categoryName.replace(/s$/, "")}</Chip>
              {item.verified ? (
                <Chip tone="emerald">Verified</Chip>
              ) : (
                <Chip tone="rose">Unverified</Chip>
              )}
              <span className={countdownTone(countdown) === "rose" && !countdown.expired ? "soft-pulse" : ""}>
                <Chip tone={countdownTone(countdown)}>{formatCountdown(countdown)}</Chip>
              </span>
              {item.employmentType ? (
                <Chip tone="muted">{EMPLOYMENT_TYPE_LABELS[item.employmentType]}</Chip>
              ) : null}
              {item.workArrangement ? (
                <Chip tone="muted">{WORK_ARRANGEMENT_LABELS[item.workArrangement]}</Chip>
              ) : null}
            </div>
            <h3 className="font-display text-xl tracking-tight transition-colors group-hover:text-accent-soft">
              {item.title}
            </h3>
            <div className="mt-1 text-sm text-muted">
              {item.organisationName}
              {item.region ? ` · ${item.region}` : ""}
              {item.workMode ? ` · ${item.workMode}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg">{item.opportunityValue}</div>
            <div className="label-mono">{item.opportunityValueUnit}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted">
            Reference: <span className="text-fg">{item.reference}</span>
          </span>
          <span className="text-accent-soft transition-transform group-hover:translate-x-0.5">
            View details →
          </span>
        </div>
      </Link>
    </div>
  );
}

export function SaveToggle({
  opportunityId,
  className = "absolute right-4 top-4 z-10",
}: {
  opportunityId: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const savedQuery = useQuery({
    queryKey: ["candidate", "saved"],
    queryFn: () => api.get<ApiOpportunitySummary[]>("/candidate/saved"),
    retry: false,
  });
  const isSaved = savedQuery.data?.some((o) => o.id === opportunityId) ?? false;

  const toggle = useMutation({
    mutationFn: () =>
      isSaved
        ? api.del(`/candidate/saved/${opportunityId}`)
        : api.post(`/candidate/saved/${opportunityId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", "saved"] });
      toast(isSaved ? "Removed from saved." : "Saved.");
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : "Could not update saved listings.",
        "error",
      ),
  });

  return (
    <button
      type="button"
      aria-label={isSaved ? "Remove from saved" : "Save this opportunity"}
      title={isSaved ? "Remove from saved" : "Save this opportunity"}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate();
      }}
      className={`${className} press rounded-md p-1.5 text-muted ring-1 ring-line backdrop-blur-sm transition-all hover:scale-110 hover:text-accent-soft hover:ring-accent/40 disabled:opacity-60`}
    >
      {isSaved ? (
        <BookmarkCheck className="size-4 text-accent-soft" />
      ) : (
        <Bookmark className="size-4" />
      )}
    </button>
  );
}
