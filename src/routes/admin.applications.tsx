import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText } from "lucide-react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { API_BASE_URL, api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/applications")({
  head: () => ({ meta: [{ title: "Applications — EOZ Staff Console" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Applications,
});

type Row = {
  id: string;
  reference: string;
  opportunityTitle: string;
  organisationName: string;
  candidateName: string;
  candidateEmail: string;
  resumeFileId: string | null;
  coverNote: string | null;
  status: string;
  submittedAt: string;
};

const STATUSES = ["SUBMITTED", "SCREENING", "LONGLISTED", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"];

const TONE: Record<string, "emerald" | "amber" | "rose" | "muted" | "accent"> = {
  HIRED: "emerald",
  OFFER: "emerald",
  SHORTLISTED: "accent",
  INTERVIEW: "accent",
  REJECTED: "rose",
  WITHDRAWN: "muted",
};

function Applications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin", "applications", status, query],
    queryFn: () =>
      api.get<PageResponse<Row>>("/admin/applications", { status: status || undefined, q: query || undefined, size: 50 }),
    retry: false,
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => api.patch(`/applications/${id}/status`, { status: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      toast("Status updated. The candidate has been notified.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update the status.", "error"),
  });

  const rows = listQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="Applications"
        title="Every application, in one place."
        lead="Applications submitted through EOZ across all opportunities. Moving one forward notifies the candidate."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(listQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a staff account that can manage applications.</p>
        </Panel>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["", ...STATUSES].map((s) => (
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
          placeholder="Search candidate, email or listing"
          className="w-full max-w-xs rounded-md bg-surface-2 px-3 py-2 text-xs outline-none ring-1 ring-line"
        />
      </div>

      <div className="space-y-3 pb-14">
        {listQuery.isSuccess && rows.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-muted">No applications match.</Panel>
        ) : null}
        {rows.map((a) => (
          <Panel key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip tone={TONE[a.status] ?? "amber"}>{a.status}</Chip>
                  <span className="font-mono text-[10px] text-muted">{a.reference}</span>
                  <span className="text-xs text-muted">{new Date(a.submittedAt).toLocaleDateString()}</span>
                </div>
                <div className="font-medium">{a.candidateName}</div>
                <div className="text-xs text-muted">{a.candidateEmail}</div>
                <div className="mt-2 text-sm">
                  {a.opportunityTitle} <span className="text-muted">· {a.organisationName}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  {a.resumeFileId ? (
                    <a
                      href={`${API_BASE_URL}/applications/${a.id}/resume`}
                      className="inline-flex items-center gap-1.5 text-accent-soft hover:text-fg"
                    >
                      <FileText aria-hidden="true" className="size-3.5" />
                      Download CV
                    </a>
                  ) : (
                    <span className="text-muted">No CV attached</span>
                  )}
                  {a.coverNote ? (
                    <button onClick={() => setOpen(open === a.id ? null : a.id)} className="text-accent-soft hover:text-fg">
                      {open === a.id ? "Hide cover note" : "Read cover note"}
                    </button>
                  ) : null}
                </div>
                {open === a.id && a.coverNote ? (
                  <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-2 p-3 text-sm text-muted">{a.coverNote}</p>
                ) : null}
              </div>
              <label className="text-xs text-muted">
                <span className="label-mono">Move to</span>
                <select
                  value={a.status}
                  disabled={changeStatus.isPending}
                  onChange={(e) => changeStatus.mutate({ id: a.id, next: e.target.value })}
                  className="mt-1 block rounded-md bg-surface-2 px-3 py-2 text-xs text-fg outline-none ring-1 ring-line"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Panel>
        ))}
      </div>
    </SiteShell>
  );
}
