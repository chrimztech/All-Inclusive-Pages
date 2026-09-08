import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock3, Download, TriangleAlert } from "lucide-react";
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
              Restoring uses <code className="font-mono">pg_restore</code> against a downloaded file — done
              manually by an administrator, never triggered from this page.
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
                      <a
                        href={`${API_BASE_URL}/admin/system/backups/${b.id}/download`}
                        className="flex items-center gap-1 text-accent-soft hover:text-fg"
                      >
                        <Download aria-hidden="true" className="size-3" />
                        Download
                      </a>
                    ) : null}
                  </div>
                  {b.errorMessage ? <p className="mt-1 text-rose-400">{b.errorMessage}</p> : null}
                </div>
              ))}
              {backupsQuery.isSuccess && backups.length === 0 ? (
                <p className="text-xs text-muted">No backups yet.</p>
              ) : null}
            </div>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
