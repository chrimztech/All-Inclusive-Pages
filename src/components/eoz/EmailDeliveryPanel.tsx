import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, RotateCcw } from "lucide-react";
import { Chip, Panel } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

type Delivery = {
  id: string;
  notificationType: string;
  recipient: string;
  subject: string;
  status: "PENDING" | "SENDING" | "RETRY" | "SENT" | "DEAD";
  attempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};

const TONE: Record<Delivery["status"], "muted" | "accent" | "amber" | "emerald" | "rose"> = {
  PENDING: "muted",
  SENDING: "accent",
  RETRY: "amber",
  SENT: "emerald",
  DEAD: "rose",
};

const STATUSES = ["", "PENDING", "RETRY", "DEAD", "SENT"] as const;

const lusaka = (iso: string) => new Date(iso).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" });

/** The email outbox: queued, retrying, sent and dead emails, with a manual retry for failures. */
export function EmailDeliveryPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("");
  const summaryQuery = useQuery({
    queryKey: ["admin", "deliveries", "summary"],
    queryFn: () => api.get<Record<string, number>>("/admin/notifications/deliveries/summary"),
    retry: false,
    refetchInterval: 30_000,
  });
  const listQuery = useQuery({
    queryKey: ["admin", "deliveries", status],
    queryFn: () => api.get<Delivery[]>("/admin/notifications/deliveries", { status: status || undefined, limit: 50 }),
    retry: false,
  });
  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/admin/notifications/deliveries/${id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deliveries"] });
      toast("Queued to send again.");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Could not retry.", "error"),
  });

  if (listQuery.error instanceof ApiError && (listQuery.error.status === 401 || listQuery.error.status === 403)) {
    return null;
  }
  const summary = summaryQuery.data ?? {};
  const rows = listQuery.data ?? [];

  return (
    <Panel className="mb-14 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Mail aria-hidden="true" className="size-4 text-accent-soft" />
          Email delivery
          {(summary["DEAD"] ?? 0) > 0 ? <Chip tone="rose">{summary["DEAD"]} failed</Chip> : null}
        </div>
        <div role="group" aria-label="Filter by status" className="inline-flex rounded-xl bg-white/[0.03] p-1 text-xs ring-1 ring-line">
          {STATUSES.map((s) => (
            <button
              key={s || "ALL"}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${status === s ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg"}`}
            >
              {s ? `${s.charAt(0)}${s.slice(1).toLowerCase()}` : "All"}
              {s && summary[s] != null ? <span className="ml-1 text-muted">{summary[s]}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-muted">
        Emails are queued with each notification and sent in the background. Failures retry after 1 min, 5 min, 30 min,
        2 h and 12 h; after five attempts they are marked failed here for review.
      </p>
      {listQuery.isLoading ? <div className="skeleton h-20 rounded-xl" /> : null}
      {listQuery.isSuccess && rows.length === 0 ? <p className="text-sm text-muted">No emails in this view.</p> : null}
      <ul className="divide-y divide-line">
        {rows.map((d) => (
          <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Chip tone={TONE[d.status]}>{d.status}</Chip>
                <span className="truncate">{d.subject}</span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {d.recipient} · {d.notificationType} · queued {lusaka(d.createdAt)}
                {d.sentAt ? ` · sent ${lusaka(d.sentAt)}` : ""}
                {d.status === "RETRY" ? ` · attempt ${d.attempts}, next ${lusaka(d.nextAttemptAt)}` : ""}
              </div>
              {d.lastError && d.status !== "SENT" ? (
                <p className="mt-1 line-clamp-2 font-mono text-[11px] text-rose/80">{d.lastError}</p>
              ) : null}
            </div>
            {d.status === "DEAD" || d.status === "RETRY" ? (
              <button
                type="button"
                disabled={retry.isPending}
                onClick={() => retry.mutate(d.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ring-1 ring-line hover:bg-surface-2 disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Send now
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
