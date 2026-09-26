import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Download,
  History,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { API_BASE_URL, api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/health")({
  head: () => ({
    meta: [{ title: "System Health - EOZ Staff" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: SystemHealth,
});

type ServiceCheck = { name: string; up: boolean; detail: string };
type ScheduledJobInfo = { name: string; interval: string };
type HealthResponse = { services: ServiceCheck[]; scheduledJobs: ScheduledJobInfo[]; uptimeSeconds: number };
type BackupRow = {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  status: string;
  errorMessage: string | null;
  triggeredByName: string;
  startedAt: string;
  completedAt: string | null;
};
type RestoreResult = {
  success: boolean;
  restoredFromFileName: string;
  safetyBackupFileName: string;
  message: string;
  flaggedCount: number;
};
type RestoreFlag = {
  id: string;
  entityType: string;
  entityId: string;
  label: string;
  deletedByName: string | null;
  deletedAt: string;
  restoredFrom: string;
  flaggedAt: string;
  quarantinedFrom: string | null;
  resolution: "KEPT" | "DELETED_AGAIN" | "GONE" | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
};

const ENTITY_LABELS: Record<string, string> = {
  User: "User account",
  Organisation: "Organisation",
  Opportunity: "Listing",
  ContentItem: "Content item",
  ContactMessage: "Contact message",
};

const RESOLUTION_LABELS: Record<string, string> = {
  KEPT: "Kept",
  DELETED_AGAIN: "Deleted again",
  GONE: "No longer present",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function SystemHealth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const healthQuery = useQuery({
    queryKey: ["admin", "system", "health"],
    queryFn: () => api.get<HealthResponse>("/admin/system/health"),
    retry: false,
    refetchInterval: 30000,
  });
  const backupsQuery = useQuery({
    queryKey: ["admin", "system", "backups"],
    queryFn: () => api.get<BackupRow[]>("/admin/system/backups"),
    retry: false,
  });

  const runBackup = useMutation({
    mutationFn: () => api.post<BackupRow>("/admin/system/backups"),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system", "backups"] });
      if (result.status === "SUCCESS") {
        toast(`Backup created: ${result.fileName} (${formatBytes(result.sizeBytes)}).`);
      } else {
        toast(result.errorMessage ?? "Backup failed.", "error");
      }
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not start backup.", "error"),
  });

  const restoreBackup = useMutation({
    mutationFn: ({ id, confirmFileName }: { id: string; confirmFileName: string }) =>
      api.post<RestoreResult>(`/admin/system/backups/${id}/restore`, { confirmFileName }),
    onSuccess: (result) => {
      // Everything may have changed underneath the page, so refetch it all.
      queryClient.invalidateQueries();
      setRestoringId(null);
      setConfirmText("");
      toast(result.message, result.success ? "success" : "error");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not restore backup.", "error"),
  });

  const services = healthQuery.data?.services ?? [];
  const allUp = services.every((s) => s.up);
  const backups = backupsQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.13 ) - System health"
        title="Safe operational signals, no secrets."
        lead="Monitor availability, storage and scheduled work without exposing credentials, customer content or raw stack traces."
        aside={
          <Panel>
            <div className="flex items-center gap-3">
              <Activity aria-hidden="true" className="size-5 text-accent-soft" />
              <div>
                <Chip tone={allUp ? "emerald" : "amber"}>{allUp ? "All systems operational" : "Degradation detected"}</Chip>
                <p className="mt-2 text-xs text-muted">Core browsing and account services are available.</p>
              </div>
            </div>
          </Panel>
        }
      />
      <DashNav items={ADMIN_NAV} />
      <RestoreFlagsPanel placement="top" />

      {isUnauthenticated(healthQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with an admin account to view system health.</p>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Uptime" value={healthQuery.data ? formatUptime(healthQuery.data.uptimeSeconds) : "—"} />
        <StatTile label="Services checked" value={String(services.length)} />
        <StatTile label="Services up" value={String(services.filter((s) => s.up).length)} />
        <StatTile label="Services down" value={String(services.filter((s) => !s.up).length)} tone="text-rose" />
      </div>
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <div className="label-mono mb-4">Service checks</div>
          <div className="space-y-1">
            {services.map((service) => (
              <div
                key={service.name}
                className="grid gap-2 border-t border-line py-4 first:border-0 first:pt-0 sm:grid-cols-[1.5fr_0.8fr_1fr] sm:items-center"
              >
                <span className="flex items-center gap-2 text-sm">
                  {service.up ? (
                    <CheckCircle2 aria-hidden="true" className="size-4 text-emerald" />
                  ) : (
                    <TriangleAlert aria-hidden="true" className="size-4 text-amber" />
                  )}
                  {service.name}
                </span>
                <Chip tone={service.up ? "emerald" : "amber"}>{service.up ? "Operational" : "Degraded"}</Chip>
                <span className="text-xs text-muted">{service.detail}</span>
              </div>
            ))}
          </div>
        </Panel>
        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4 text-accent-soft" />
              <div className="label-mono">Scheduled jobs</div>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {(healthQuery.data?.scheduledJobs ?? []).map((job) => (
                <li key={job.name} className="flex justify-between">
                  <span>{job.name}</span>
                  <span className="text-muted">{job.interval}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <div className="flex items-center justify-between gap-2">
              <div className="label-mono">Database backups</div>
              <button
                type="button"
                disabled={runBackup.isPending}
                onClick={() => runBackup.mutate()}
                className="accent-gradient rounded-md px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
              >
                {runBackup.isPending ? "Running…" : "Back up now"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Real pg_dump backups, taken automatically every 24 hours and kept for the most recent 14 runs.
              Restoring runs <code className="font-mono">pg_restore</code> against a stored backup — admin-only,
              requires typing the exact filename to confirm, and a fresh safety backup is taken first.
            </p>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {backupsQuery.isLoading ? <p className="text-xs text-muted">Loading…</p> : null}
              {backups.map((b) => (
                <div key={b.id} className="rounded-md bg-surface-2 p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono">{b.fileName}</span>
                    <Chip tone={b.status === "SUCCESS" ? "emerald" : b.status === "RUNNING" ? "amber" : "rose"}>
                      {b.status}
                    </Chip>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-muted">
                    <span>
                      {new Date(b.startedAt).toLocaleString()} · {formatBytes(b.sizeBytes)} · {b.triggeredByName}
                    </span>
                    {b.status === "SUCCESS" ? (
                      <div className="flex items-center gap-3">
                        <a
                          href={`${API_BASE_URL}/admin/system/backups/${b.id}/download`}
                          className="flex items-center gap-1 text-accent-soft hover:text-fg"
                        >
                          <Download aria-hidden="true" className="size-3" />
                          Download
                        </a>
                        {restoringId !== b.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRestoringId(b.id);
                              setConfirmText("");
                            }}
                            className="text-rose hover:text-rose/80"
                          >
                            Restore…
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {b.errorMessage ? <p className="mt-1 text-rose-400">{b.errorMessage}</p> : null}
                  {restoringId === b.id ? (
                    <div className="mt-3 space-y-2 rounded-md ring-1 ring-rose/30 bg-rose/5 p-3">
                      <p className="leading-5 text-rose-300">
                        This overwrites the current database with <span className="font-mono">{b.fileName}</span>.
                        A fresh safety backup of the current state is taken automatically first. Type the filename
                        exactly to confirm.
                      </p>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={b.fileName}
                        className="w-full rounded-md bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] outline-none ring-1 ring-line"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={restoreBackup.isPending || confirmText !== b.fileName}
                          onClick={() => restoreBackup.mutate({ id: b.id, confirmFileName: confirmText })}
                          className="rounded-md bg-rose px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
                        >
                          {restoreBackup.isPending ? "Restoring…" : "Confirm restore"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRestoringId(null)}
                          className="rounded-md px-3 py-1.5 text-[11px] text-muted ring-1 ring-line hover:text-fg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
              {backupsQuery.isSuccess && backups.length === 0 ? (
                <p className="text-xs text-muted">No backups yet.</p>
              ) : null}
            </div>
          </Panel>
        </aside>
      </section>
      <RestoreFlagsPanel placement="bottom" />
    </SiteShell>
  );
}

/** Permanently deleted items that came back with a restore, for an administrator to keep or delete again. */
/**
 * Rendered in two places sharing one query: at the top of the page while items await review (the
 * restore notification links here), otherwise quietly at the bottom.
 */
function RestoreFlagsPanel({ placement }: { placement: "top" | "bottom" }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showResolved, setShowResolved] = useState(false);
  const flagsQuery = useQuery({
    queryKey: ["admin", "system", "restore-flags"],
    queryFn: () => api.get<RestoreFlag[]>("/admin/system/backups/restore-flags"),
    retry: false,
  });
  const onDone = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    toast(message);
  };
  const onFail = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : "Could not update this item.", "error");
  const keep = useMutation({
    mutationFn: (id: string) => api.post(`/admin/system/backups/restore-flags/${id}/keep`),
    onSuccess: () => onDone("Kept. Any quarantine was lifted."),
    onError: onFail,
  });
  const deleteAgain = useMutation({
    mutationFn: (id: string) => api.post(`/admin/system/backups/restore-flags/${id}/delete-again`),
    onSuccess: () => onDone("Deleted again permanently."),
    onError: onFail,
  });

  if (isUnauthenticated(flagsQuery.error)) return null;
  const flags = flagsQuery.data ?? [];
  const open = flags.filter((f) => f.resolution === null);
  const resolved = flags.filter((f) => f.resolution !== null);
  const busy = keep.isPending || deleteAgain.isPending;
  if ((open.length > 0) !== (placement === "top")) return null;

  return (
    <section className={placement === "top" ? "pb-6" : "pb-14"} aria-labelledby="restore-flags-heading">
      <Panel className={open.length ? "ring-amber/40" : ""}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div id="restore-flags-heading" className="flex items-center gap-2 text-sm font-medium">
              <History aria-hidden="true" className="size-4 text-amber" />
              Restored deletions
              {open.length ? <Chip tone="amber">{open.length} to review</Chip> : null}
            </div>
            <p className="mt-1 max-w-[70ch] text-xs leading-5 text-muted">
              A restore brings back anything that was permanently deleted after the backup was taken. Those
              items are flagged here: returned listings go back to review and returned accounts are
              deactivated until you decide. Keep lifts that; Delete again repeats the original permanent
              delete.
            </p>
          </div>
          {resolved.length ? (
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="text-xs text-accent-soft hover:text-fg"
            >
              {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
            </button>
          ) : null}
        </div>

        {flagsQuery.isLoading ? <div className="skeleton mt-4 h-16 rounded-xl" /> : null}
        {flagsQuery.isError ? (
          <p className="mt-4 text-xs text-rose">Could not load restored deletions.</p>
        ) : null}
        {flagsQuery.isSuccess && open.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <CheckCircle2 aria-hidden="true" className="size-4 text-emerald" />
            Nothing to review — no deleted items have come back.
          </p>
        ) : null}

        <ul className="mt-4 divide-y divide-line">
          {[...open, ...(showResolved ? resolved : [])].map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={f.resolution ? "muted" : "amber"}>
                    {ENTITY_LABELS[f.entityType] ?? f.entityType}
                  </Chip>
                  <span className="truncate text-sm">{f.label}</span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  Deleted {new Date(f.deletedAt).toLocaleString()}
                  {f.deletedByName ? ` by ${f.deletedByName}` : ""} · returned with{" "}
                  <span className="font-mono">{f.restoredFrom}</span>
                  {f.quarantinedFrom && !f.resolution ? (
                    <span className="text-amber">
                      {" "}
                      · {f.entityType === "User" ? "deactivated" : "sent back to review"} (was{" "}
                      {f.quarantinedFrom.toLowerCase().replace(/_/g, " ")})
                    </span>
                  ) : null}
                  {f.resolution ? (
                    <span>
                      {" "}
                      · {RESOLUTION_LABELS[f.resolution]}
                      {f.resolvedByName ? ` by ${f.resolvedByName}` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
              {!f.resolution ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => keep.mutate(f.id)}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                    Keep
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Permanently delete "${f.label}" again? This cannot be undone.`)) {
                        deleteAgain.mutate(f.id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[0.625rem] px-3 py-1.5 text-xs text-rose ring-1 ring-rose/30 transition-colors hover:bg-rose/10 disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    Delete again
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}
