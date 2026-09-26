import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eraser, Recycle, UserX } from "lucide-react";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/privacy")({
  head: () => ({
    meta: [{ title: "Privacy Requests - EOZ Staff" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: PrivacyAdmin,
});

type PrivacyRequest = {
  id: string;
  userId: string | null;
  subjectLabel: string;
  requestType: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  requestedAt: string;
  dueAt: string;
  completedAt: string | null;
  completedByName: string | null;
  notes: string | null;
};

const TONE = { PENDING: "amber", COMPLETED: "emerald", CANCELLED: "muted" } as const;
const lusaka = (iso: string) =>
  new Date(iso).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka", dateStyle: "medium", timeStyle: "short" });

function PrivacyAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<"" | "PENDING" | "COMPLETED" | "CANCELLED">("PENDING");
  const requestsQuery = useQuery({
    queryKey: ["admin", "privacy", status],
    queryFn: () => api.get<PrivacyRequest[]>("/admin/privacy/requests", { status: status || undefined }),
    retry: false,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "privacy"] });
  const fail = (e: unknown, fallback: string) => toast(e instanceof ApiError ? e.message : fallback, "error");

  const complete = useMutation({
    mutationFn: (id: string) => api.post(`/admin/privacy/requests/${id}/complete`),
    onSuccess: () => {
      refresh();
      toast("Personal data erased and the account anonymised.");
    },
    onError: (e) => fail(e, "Could not complete the request."),
  });
  const cancel = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.post(`/admin/privacy/requests/${id}/cancel`, { notes }),
    onSuccess: () => {
      refresh();
      toast("Request cancelled and the account reopened.");
    },
    onError: (e) => fail(e, "Could not cancel the request."),
  });

  const requests = requestsQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.17 ) - Privacy"
        title="Deletion requests and retention."
        lead="Accounts are closed as soon as deletion is requested and erased after the grace period — or now, if you complete the request. Records that must be kept (applications, payments, consent evidence) are anonymised, not deleted."
      />
      <DashNav items={ADMIN_NAV} />
      {isUnauthenticated(requestsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with an account that manages users to review privacy requests.</p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserX aria-hidden="true" className="size-4 text-accent-soft" />
                Account deletion requests
              </div>
              <div role="group" aria-label="Filter" className="inline-flex rounded-xl bg-white/[0.03] p-1 text-xs ring-1 ring-line">
                {(["PENDING", "COMPLETED", "CANCELLED", ""] as const).map((s) => (
                  <button
                    key={s || "ALL"}
                    type="button"
                    aria-pressed={status === s}
                    onClick={() => setStatus(s)}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${status === s ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {s ? `${s.charAt(0)}${s.slice(1).toLowerCase()}` : "All"}
                  </button>
                ))}
              </div>
            </div>
            {requestsQuery.isLoading ? <div className="skeleton h-20 rounded-xl" /> : null}
            {requestsQuery.isSuccess && requests.length === 0 ? (
              <p className="text-sm text-muted">No requests in this view.</p>
            ) : null}
            <ul className="divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Chip tone={TONE[r.status]}>{r.status}</Chip>
                      {r.subjectLabel}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Requested {lusaka(r.requestedAt)}
                      {r.status === "PENDING" ? ` · erased automatically ${lusaka(r.dueAt)}` : ""}
                      {r.completedAt ? ` · ${r.status.toLowerCase()} ${lusaka(r.completedAt)}` : ""}
                      {r.completedByName ? ` by ${r.completedByName}` : ""}
                      {r.notes ? ` · “${r.notes}”` : ""}
                    </div>
                  </div>
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={complete.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Erase ${r.subjectLabel}'s personal data now? This cannot be undone.`,
                            )
                          ) {
                            complete.mutate(r.id);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-rose ring-1 ring-rose/30 hover:bg-rose/10 disabled:opacity-60"
                      >
                        <Eraser aria-hidden="true" className="size-3.5" />
                        Erase now
                      </button>
                      <button
                        type="button"
                        disabled={cancel.isPending}
                        onClick={() => {
                          const notes = window.prompt("Why is this request being cancelled?", "");
                          if (notes !== null) cancel.mutate({ id: r.id, notes });
                        }}
                        className="rounded-md px-3 py-1.5 text-xs ring-1 ring-line hover:bg-surface-2 disabled:opacity-60"
                      >
                        Cancel & reopen
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="space-y-6 lg:col-span-4">
          <GracePeriod />
          <RetentionRun />
        </div>
      </section>
    </SiteShell>
  );
}

function GracePeriod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api.get<{ key: string; value: string }[]>("/admin/settings"),
    retry: false,
  });
  const current = settingsQuery.data?.find((s) => s.key === "privacy.deletion_grace_days")?.value ?? "30";
  const [days, setDays] = useState(current);
  useEffect(() => setDays(current), [current]);
  const save = useMutation({
    mutationFn: () => api.put("/admin/settings/privacy.deletion_grace_days", { value: String(Number(days)) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast("Grace period saved. It applies to new requests.");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Could not save.", "error"),
  });
  if (settingsQuery.isError) return null;
  return (
    <Panel className="p-6">
      <div className="mb-2 text-sm font-medium">Deletion grace period</div>
      <p className="mb-3 text-xs text-muted">Days between a deletion request and automatic erasure.</p>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="text-xs text-muted">
          Days
          <input
            type="number"
            min={0}
            max={365}
            required
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="mt-1 block w-24 rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line"
          />
        </label>
        <button
          type="submit"
          disabled={save.isPending || days === current}
          className="accent-gradient rounded-md px-3 py-2 text-sm font-medium text-ink disabled:opacity-60"
        >
          Save
        </button>
      </form>
    </Panel>
  );
}

function RetentionRun() {
  const { toast } = useToast();
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const run = useMutation({
    mutationFn: () => api.post<Record<string, number>>("/admin/privacy/retention/run"),
    onSuccess: (r) => {
      setResult(r);
      toast("Retention clean-up finished.");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Could not run the clean-up.", "error"),
  });
  const LABELS: Record<string, string> = {
    sessions: "Old sessions",
    verificationTokens: "Expired verification links",
    mfaChallenges: "Expired sign-in challenges",
    sentEmails: "Sent email records (90 days+)",
    readNotifications: "Read notifications (1 year+)",
    exports: "Expired export files",
    accountsErased: "Accounts erased",
  };
  return (
    <Panel className="p-6">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Recycle aria-hidden="true" className="size-4 text-accent-soft" />
        Retention clean-up
      </div>
      <p className="mb-3 text-xs leading-5 text-muted">
        Runs automatically every day. Removes old sessions and tokens, sent email records after 90 days, read
        notifications after a year, expired exports, and erases accounts whose grace period has ended.
      </p>
      <button type="button" disabled={run.isPending} onClick={() => run.mutate()} className="btn-secondary px-3 py-2 text-xs">
        {run.isPending ? "Running…" : "Run now"}
      </button>
      {result ? (
        <dl className="mt-4 space-y-1 text-xs">
          {Object.entries(result).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-muted">{LABELS[k] ?? k}</dt>
              <dd className="font-mono">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Panel>
  );
}
