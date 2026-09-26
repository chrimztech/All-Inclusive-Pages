import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { DeadlineChip } from "@/components/eoz/OpportunityCard";
import { ListingEditor } from "@/components/eoz/ListingEditor";
import { useState } from "react";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/employers/listings")({
  head: () => ({
    meta: [
      { title: "Opportunity Listings - EOZ Employer Portal" },
      {
        name: "description",
        content: "Draft, submit, renew and review your organisation's EOZ opportunities.",
      },
    ],
  }),
  component: EmployerListings,
});

type EmployerOpportunity = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  categoryName: string;
  organisationName: string;
  region: string | null;
  workMode: string | null;
  status: string;
  verified: boolean;
  viewsCount: number;
  savesCount: number;
  deadline: string | null;
  publishedAt: string | null;
  createdAt: string;
};

type Stats = { published: number; pendingReview: number; drafts: number; closed: number };

const STATUS_TONE: Record<string, "emerald" | "amber" | "muted" | "rose"> = {
  PUBLISHED: "emerald",
  PENDING_REVIEW: "amber",
  APPROVED: "amber",
  SCHEDULED: "amber",
  DRAFT: "muted",
  CLOSED: "rose",
  EXPIRED: "rose",
  ARCHIVED: "muted",
};

function EmployerListings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const closeListing = useMutation({
    mutationFn: (id: string) => api.patch(`/opportunities/mine/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "opportunities"] });
      toast("Listing updated.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update the listing.", "error"),
  });
  const listingsQuery = useQuery({
    queryKey: ["employer", "opportunities", "mine"],
    queryFn: () => api.get<PageResponse<EmployerOpportunity>>("/opportunities/mine", { size: 50 }),
    retry: false,
  });
  const statsQuery = useQuery({
    queryKey: ["employer", "opportunities", "mine", "stats"],
    queryFn: () => api.get<Stats>("/opportunities/mine/stats"),
    retry: false,
  });

  const listings = listingsQuery.data?.items ?? [];
  const stats = statsQuery.data;

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.3 ) - Listings"
        title="Every opportunity, from draft to archive."
        lead="See exactly where each listing sits, keep the employer-approved application route current and renew closed opportunities safely."
        aside={
          <Panel>
            <Link
              to="/employers/post"
              className="accent-gradient inline-flex rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Create opportunity
            </Link>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(listingsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as an employer to see your listings.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Published" value={String(stats?.published ?? "—")} />
        <StatTile
          label="Pending review"
          value={String(stats?.pendingReview ?? "—")}
          tone="text-amber"
        />
        <StatTile label="Drafts" value={String(stats?.drafts ?? "—")} />
        <StatTile label="Closed" value={String(stats?.closed ?? "—")} />
      </div>

      <div className="space-y-3 pb-14">
        {listingsQuery.isLoading ? (
          <Panel className="py-10 text-center text-sm text-muted">Loading your listings…</Panel>
        ) : listings.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-muted">
            You haven't submitted any opportunities yet.
          </Panel>
        ) : (
          listings.map((o) => {
            return (
              <Panel key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Chip tone={STATUS_TONE[o.status] ?? "muted"}>
                        {o.status.replace(/_/g, " ")}
                      </Chip>
                      {o.status === "PUBLISHED" ? <DeadlineChip deadline={o.deadline} /> : null}
                      <span className="font-mono text-[10px] text-muted">{o.reference}</span>
                    </div>
                    <h2 className="font-display text-xl tracking-tight">{o.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {o.categoryName} · {o.region ?? "National"}{" "}
                      {o.workMode ? `· ${o.workMode}` : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                      <span>{o.viewsCount} views</span>
                      <span>{o.savesCount} saves</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.status === "PUBLISHED" ? (
                      <Link
                        to="/opportunities/$opportunityId"
                        params={{ opportunityId: o.slug }}
                        className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft"
                      >
                        View listing
                      </Link>
                    ) : null}
                    {["PUBLISHED", "DRAFT", "PENDING_REVIEW", "APPROVED", "SCHEDULED"].includes(o.status) ? (
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === o.id ? null : o.id)}
                        className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft"
                      >
                        {editingId === o.id ? "Close editor" : o.status === "DRAFT" ? "Edit & resubmit" : "Edit"}
                      </button>
                    ) : null}
                    {["PUBLISHED", "DRAFT", "PENDING_REVIEW", "APPROVED", "SCHEDULED"].includes(o.status) ? (
                      <button
                        type="button"
                        disabled={closeListing.isPending}
                        onClick={() => {
                          const live = o.status === "PUBLISHED";
                          if (window.confirm(live ? `Close "${o.title}"? It will leave the public board.` : `Withdraw "${o.title}"?`)) {
                            closeListing.mutate(o.id);
                          }
                        }}
                        className="rounded-md px-3 py-2 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                      >
                        {o.status === "PUBLISHED" ? "Close listing" : "Withdraw"}
                      </button>
                    ) : null}
                  </div>
                </div>
                {editingId === o.id ? (
                  <ListingEditor
                    opportunityId={o.id}
                    isStaff={false}
                    invalidateKeys={[["employer", "opportunities"]]}
                    onClose={() => setEditingId(null)}
                  />
                ) : null}
              </Panel>
            );
          })
        )}
      </div>
    </SiteShell>
  );
}
