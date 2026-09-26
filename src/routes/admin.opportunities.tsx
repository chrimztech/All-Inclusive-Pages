import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ListingEditor } from "@/components/eoz/ListingEditor";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { VersionHistory } from "@/components/eoz/VersionHistory";

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
  deadline: string | null;
  featured: boolean;
  viewsCount: number;
  applyClicks: number;
};

/** Datetime-local value one week from now, as a sensible default for a new deadline. */
function inAWeek() {
  const d = new Date(Date.now() + 7 * 864e5);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState(inAWeek());
  const [extendReason, setExtendReason] = useState("");

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
  const close = useMutation({
    mutationFn: (id: string) => api.patch(`/opportunities/${id}/close`),
    onSuccess: () => {
      invalidate();
      toast("Listing closed.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not close listing.", "error"),
  });
  const reopen = useMutation({
    mutationFn: (id: string) => api.patch(`/opportunities/${id}/reopen`),
    onSuccess: () => {
      invalidate();
      toast("Listing reopened and sent back to review.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not reopen listing.", "error"),
  });
  const permanentDelete = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: string }) =>
      api.del(`/admin/permanent-delete/opportunities/${id}?confirm=${encodeURIComponent(confirm)}`),
    onSuccess: () => {
      invalidate();
      toast("Listing permanently deleted.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not delete the listing.", "error"),
  });
  const archive = useMutation({
    mutationFn: (id: string) => api.patch(`/opportunities/${id}/archive`),
    onSuccess: () => {
      invalidate();
      toast("Listing archived.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not archive listing.", "error"),
  });

  const feature = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      api.patch(`/opportunities/${id}/feature`, { featured }),
    onSuccess: (_data, { featured }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast(featured ? "Featured on the home page." : "Removed from featured.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update featured status.", "error"),
  });
  const extend = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.patch(`/opportunities/${id}/extend`, {
        deadline: new Date(newDeadline).toISOString(),
        reason: extendReason.trim(),
      }),
    onSuccess: () => {
      invalidate();
      setExtendingId(null);
      setExtendReason("");
      toast("Deadline extended. The reason was recorded in the audit log.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not extend the deadline.", "error"),
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
                  <span>
                    Closes{" "}
                    {r.deadline
                      ? new Date(r.deadline).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" })
                      : "— no deadline"}
                  </span>
                  <span>
                    {r.viewsCount} views · {r.applyClicks} apply clicks
                  </span>
                  {r.featured ? <span className="text-amber">★ Featured</span> : null}
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
                {r.status === "PUBLISHED" ? (
                  <button
                    onClick={() => close.mutate(r.id)}
                    disabled={close.isPending}
                    className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft disabled:opacity-60"
                  >
                    Close listing
                  </button>
                ) : null}
                {r.status !== "CLOSED" && r.status !== "ARCHIVED" && r.status !== "EXPIRED" ? (
                  <button
                    onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                    className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft"
                  >
                    {editingId === r.id ? "Close editor" : "Edit"}
                  </button>
                ) : null}
                {r.status === "CLOSED" || r.status === "ARCHIVED" || r.status === "EXPIRED" ? (
                  <button
                    onClick={() => reopen.mutate(r.id)}
                    disabled={reopen.isPending}
                    className="rounded-md px-3 py-2 text-xs text-emerald ring-1 ring-emerald/30 disabled:opacity-60"
                  >
                    Reopen
                  </button>
                ) : null}
                {["PUBLISHED", "SCHEDULED", "APPROVED"].includes(r.status) ? (
                  <button
                    onClick={() => feature.mutate({ id: r.id, featured: !r.featured })}
                    disabled={feature.isPending}
                    aria-pressed={r.featured}
                    className={`rounded-md px-3 py-2 text-xs ring-1 disabled:opacity-60 ${
                      r.featured ? "bg-amber/10 text-amber ring-amber/40" : "text-fg ring-line hover:bg-surface-2"
                    }`}
                  >
                    {r.featured ? "★ Unfeature" : "☆ Feature"}
                  </button>
                ) : null}
                {["PUBLISHED", "SCHEDULED", "APPROVED", "CLOSED", "EXPIRED"].includes(r.status) ? (
                  <button
                    onClick={() => {
                      setExtendingId(extendingId === r.id ? null : r.id);
                      setNewDeadline(inAWeek());
                      setExtendReason("");
                    }}
                    className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft"
                  >
                    {extendingId === r.id ? "Cancel extension" : "Extend deadline"}
                  </button>
                ) : null}
                <button
                  onClick={() => setHistoryId(historyId === r.id ? null : r.id)}
                  aria-expanded={historyId === r.id}
                  className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft"
                >
                  {historyId === r.id ? "Hide history" : "History"}
                </button>
                {r.status !== "ARCHIVED" ? (
                  <button
                    onClick={() => {
                      if (window.confirm(`Archive "${r.title}"? It will be pulled down from the public board.`)) {
                        archive.mutate(r.id);
                      }
                    }}
                    disabled={archive.isPending}
                    className="rounded-md px-3 py-2 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                  >
                    Archive
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    const typed = window.prompt(
                      `PERMANENT DELETE. This erases "${r.title}" and every application to it. It cannot be undone.

Type the reference (${r.reference}) to confirm:`,
                    );
                    if (typed) permanentDelete.mutate({ id: r.id, confirm: typed });
                  }}
                  disabled={permanentDelete.isPending}
                  className="rounded-md px-3 py-2 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
            {historyId === r.id ? <VersionHistory opportunityId={r.id} /> : null}
            {extendingId === r.id ? (
              <form
                className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[auto_1fr_auto] sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  extend.mutate({ id: r.id });
                }}
              >
                <label className="text-xs text-muted">
                  New closing date (Lusaka time)
                  <input
                    type="datetime-local"
                    required
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/40"
                  />
                </label>
                <label className="text-xs text-muted">
                  Reason (recorded in the audit log)
                  <input
                    required
                    minLength={5}
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                    placeholder="e.g. Employer extended the closing date on their careers page"
                    className="mt-1 block w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/40"
                  />
                </label>
                <button
                  type="submit"
                  disabled={extend.isPending || extendReason.trim().length < 5}
                  className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                >
                  {extend.isPending ? "Saving…" : ["CLOSED", "EXPIRED"].includes(r.status) ? "Extend & re-publish" : "Extend"}
                </button>
              </form>
            ) : null}
            {editingId === r.id ? (
              <ListingEditor
                opportunityId={r.id}
                isStaff
                invalidateKeys={[["admin", "opportunities"], ["admin", "moderation-queue"]]}
                onClose={() => setEditingId(null)}
              />
            ) : null}
          </Panel>
        ))}
      </div>
    </SiteShell>
  );
}
