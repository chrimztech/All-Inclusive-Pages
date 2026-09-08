import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunity Workspace - EOZ Staff" },
      {
        name: "description",
        content: "Create, verify, schedule and manage EOZ opportunity records.",
      },
    ],
  }),
  component: OpportunityWorkspace,
});

type Row = {
  id: string;
  reference: string;
  title: string;
  organisationName: string;
  region: string | null;
  status: string;
  createdByName: string | null;
  flaggedDuplicateOfReference: string | null;
  createdAt: string;
};

const STATUS_TONE: Record<string, "muted" | "amber" | "accent" | "emerald" | "rose"> = {
  DRAFT: "muted",
  PENDING_REVIEW: "amber",
  APPROVED: "accent",
  SCHEDULED: "accent",
  PUBLISHED: "emerald",
  CLOSED: "muted",
  EXPIRED: "muted",
  ARCHIVED: "rose",
};

const STATUS_FILTERS = ["", "DRAFT", "PENDING_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "CLOSED", "EXPIRED", "ARCHIVED"];

function OpportunityWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  const listQuery = useQuery({
    queryKey: ["admin", "opportunities", status],
    queryFn: () => api.get<PageResponse<Row>>("/opportunities/admin/all", { status: status || undefined, size: 50 }),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "opportunities"] });
  const publish = useMutation({
    mutationFn: (id: string) => api.patch(`/opportunities/${id}/publish`),
    onSuccess: () => {
      invalidate();
      toast("Listing published.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not publish listing.", "error"),
  });

  const rows = (listQuery.data?.items ?? []).filter((r) =>
    `${r.title} ${r.reference} ${r.organisationName} ${r.status}`.toLowerCase().includes(query.toLowerCase()),
  );
  const counts = {
    draft: rows.filter((r) => r.status === "DRAFT").length,
    review: rows.filter((r) => r.status === "PENDING_REVIEW").length,
    scheduled: rows.filter((r) => r.status === "SCHEDULED").length,
    live: rows.filter((r) => r.status === "PUBLISHED").length,
  };

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.1 ) - Opportunity workspace"
        title="The complete publication lifecycle."
        lead="Draft and maintain canonical opportunity records, verify employer-approved routes, schedule publication and close expired listings with an audit trail."
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
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(listQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a content, manager or admin account to view the workspace.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Drafts" value={String(counts.draft)} />
        <StatTile label="Review queue" value={String(counts.review)} tone="text-amber" />
        <StatTile label="Scheduled" value={String(counts.scheduled)} />
        <StatTile label="Live" value={String(counts.live)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || "ALL"}
              onClick={() => setStatus(s)}
              className={
                status === s
                  ? "accent-gradient rounded-full px-3 py-1 text-[10px] font-medium text-ink"
                  : "rounded-full px-3 py-1 font-mono text-[10px] text-muted ring-1 ring-line hover:text-fg"
              }
            >
              {s || "ALL"}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, reference or organisation"
          className="w-full max-w-xs rounded-md bg-surface-2 px-3 py-2 text-xs outline-none ring-1 ring-line"
        />
      </div>

      <div className="space-y-3 pb-14">
        {rows.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-muted">No records match.</Panel>
        ) : null}
        {rows.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip tone={STATUS_TONE[r.status] ?? "muted"}>{r.status}</Chip>
                  <span className="font-mono text-[10px] text-muted">{r.reference}</span>
                  {r.flaggedDuplicateOfReference ? (
                    <Chip tone="rose">possible duplicate of {r.flaggedDuplicateOfReference}</Chip>
                  ) : null}
                </div>
                <h2 className="font-display text-xl tracking-tight">{r.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {r.organisationName}
                  {r.region ? ` · ${r.region}` : ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                  <span>Submitted by {r.createdByName ?? "Unknown"}</span>
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status === "PENDING_REVIEW" || r.status === "APPROVED" ? (
                  <Link
                    to="/admin/moderation"
                    className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft"
                  >
                    Open in moderation
                  </Link>
                ) : null}
                {r.status === "SCHEDULED" ? (
                  <button
                    onClick={() => publish.mutate(r.id)}
                    disabled={publish.isPending}
                    className="accent-gradient rounded-md px-3 py-2 text-xs font-medium text-ink disabled:opacity-60"
                  >
                    Publish now
                  </button>
                ) : null}
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </SiteShell>
  );
}
