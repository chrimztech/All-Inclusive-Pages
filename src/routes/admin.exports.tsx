import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { API_BASE_URL, api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/exports")({
  head: () => ({
    meta: [{ title: "Data Exports - EOZ Staff" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: Exports,
});

type ExportType = { type: string; label: string };
type Job = {
  id: string;
  exportType: string;
  label: string;
  status: "QUEUED" | "RUNNING" | "READY" | "FAILED" | "EXPIRED";
  requestedByName: string | null;
  rowCount: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
};

const TONE: Record<Job["status"], "muted" | "accent" | "emerald" | "rose" | "amber"> = {
  QUEUED: "muted",
  RUNNING: "accent",
  READY: "emerald",
  FAILED: "rose",
  EXPIRED: "amber",
};

const lusaka = (iso: string) => new Date(iso).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" });

function Exports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const typesQuery = useQuery({
    queryKey: ["admin", "exports", "types"],
    queryFn: () => api.get<ExportType[]>("/admin/exports/types"),
    retry: false,
  });
  const jobsQuery = useQuery({
    queryKey: ["admin", "exports", "jobs"],
    queryFn: () => api.get<Job[]>("/admin/exports"),
    retry: false,
    // Poll while anything is still being generated.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((j) => j.status === "QUEUED" || j.status === "RUNNING") ? 3000 : false,
  });
  const request = useMutation({
    mutationFn: (type: string) => api.post<Job>("/admin/exports", { type }),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "exports", "jobs"] });
      toast(`${job.label} export queued. It will be ready here in a moment.`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Could not start the export.", "error"),
  });

  const types = typesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.16 ) - Exports"
        title="Data out, safely."
        lead="Request CSV exports of the records your role can see. Files are generated in the background, mask personal contact details and are deleted after 7 days."
      />
      <DashNav items={ADMIN_NAV} />
      {isUnauthenticated(typesQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a staff account to export data.</p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium">
              <FileSpreadsheet aria-hidden="true" className="size-4 text-accent-soft" />
              New export
            </div>
            {typesQuery.isSuccess && types.length === 0 ? (
              <p className="text-sm text-muted">Your role does not include any exportable data.</p>
            ) : null}
            <ul className="space-y-2">
              {types.map((t) => (
                <li key={t.type}>
                  <button
                    type="button"
                    disabled={request.isPending}
                    onClick={() => request.mutate(t.type)}
                    className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 text-left text-sm ring-1 ring-line transition-colors hover:bg-white/[0.06] hover:ring-accent/30 disabled:opacity-60"
                  >
                    {t.label}
                    <span className="text-xs text-accent-soft">Export CSV →</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex gap-2 text-xs leading-5 text-muted">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-soft" />
              Every export and download is recorded in the audit log. Unusually many exports alert administrators.
            </p>
          </Panel>
        </div>

        <div className="lg:col-span-8">
          <Panel className="p-6">
            <div className="mb-4 text-sm font-medium">Your exports</div>
            {jobsQuery.isLoading ? <div className="skeleton h-24 rounded-xl" /> : null}
            {jobsQuery.isSuccess && jobs.length === 0 ? (
              <p className="text-sm text-muted">No exports yet.</p>
            ) : null}
            <ul className="divide-y divide-line">
              {jobs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Chip tone={TONE[j.status]}>{j.status}</Chip>
                      {j.label}
                      {j.rowCount != null ? <span className="text-xs text-muted">{j.rowCount} rows</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Requested {lusaka(j.createdAt)}
                      {j.requestedByName ? ` by ${j.requestedByName}` : ""}
                      {j.status === "READY" && j.expiresAt ? ` · available until ${lusaka(j.expiresAt)}` : ""}
                      {j.error ? ` · ${j.error}` : ""}
                    </div>
                  </div>
                  {j.status === "READY" ? (
                    <a
                      href={`${API_BASE_URL}/admin/exports/${j.id}/download`}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      <Download aria-hidden="true" className="size-3.5" />
                      Download
                    </a>
                  ) : j.status === "QUEUED" || j.status === "RUNNING" ? (
                    <span className="soft-pulse text-xs text-muted">Generating…</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </section>
    </SiteShell>
  );
}
