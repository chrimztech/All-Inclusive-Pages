import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation Queue — EOZ Staff Console" },
      {
        name: "description",
        content: "Review, approve or reject submitted opportunities before they reach the public board.",
      },
      { property: "og:title", content: "Moderation Queue — EOZ Staff Console" },
      {
        property: "og:description",
        content: "Verification workflow for submitted listings: draft, pending review, approved, rejected.",
      },
    ],
  }),
  component: Moderation,
});

type QueueItem = {
  id: string;
  reference: string;
  title: string;
  categoryName: string;
  organisationName: string;
  region: string | null;
  status: string;
  source: string | null;
  applicationMode: string;
  createdByName: string | null;
  createdAt: string;
};

type FraudReport = {
  id: string;
  opportunityId: string | null;
  opportunityTitle: string | null;
  listingReference: string | null;
  reason: string;
  description: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  status: string;
  createdAt: string;
};

const toneFor: Record<string, "amber" | "emerald" | "muted"> = {
  PENDING_REVIEW: "amber",
  APPROVED: "emerald",
};

function Moderation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queueQuery = useQuery({
    queryKey: ["admin", "moderation-queue"],
    queryFn: () => api.get<PageResponse<QueueItem>>("/opportunities/moderation/queue", { size: 50 }),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "moderation-queue"] });
  function errorMessage(error: unknown, fallback: string) {
    return error instanceof ApiError ? error.message : fallback;
  }

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/opportunities/${id}/approve`),
    onSuccess: () => {
      invalidate();
      toast("Listing approved.");
    },
    onError: (error) => toast(errorMessage(error, "Could not approve listing."), "error"),
  });
  const publish = useMutation({
    mutationFn: (id: string) => api.patch(`/opportunities/${id}/publish`),
    onSuccess: () => {
      invalidate();
      toast("Listing published.");
    },
    onError: (error) => toast(errorMessage(error, "Could not publish listing."), "error"),
  });
  const requestChanges = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/opportunities/${id}/request-changes`, { reason }),
    onSuccess: () => {
      invalidate();
      toast("Changes requested.");
    },
    onError: (error) => toast(errorMessage(error, "Could not request changes."), "error"),
  });
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const scheduleListing = useMutation({
    mutationFn: ({ id, at }: { id: string; at: string }) =>
      api.patch(`/opportunities/${id}/schedule`, { scheduledAt: new Date(at).toISOString() }),
    onSuccess: () => {
      invalidate();
      setSchedulingId(null);
      setScheduleAt("");
      toast("Listing scheduled.");
    },
    onError: (error) => toast(errorMessage(error, "Could not schedule listing."), "error"),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.patch(`/opportunities/${id}/reject`, { reason }),
    onSuccess: () => {
      invalidate();
      toast("Listing rejected.");
    },
    onError: (error) => toast(errorMessage(error, "Could not reject listing."), "error"),
  });

  const busy =
    approve.isPending || publish.isPending || requestChanges.isPending || reject.isPending || scheduleListing.isPending;
  const items = queueQuery.data?.items ?? [];

  const fraudReportsQuery = useQuery({
    queryKey: ["admin", "fraud-reports"],
    queryFn: () => api.get<PageResponse<FraudReport>>("/admin/fraud-reports", { status: "OPEN", size: 50 }),
    retry: false,
  });
  const invalidateFraudReports = () => queryClient.invalidateQueries({ queryKey: ["admin", "fraud-reports"] });

  const resolveFraudReport = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/fraud-reports/${id}`, { status: "RESOLVED" }),
    onSuccess: () => {
      invalidateFraudReports();
      toast("Fraud report marked resolved.");
    },
    onError: (error) => toast(errorMessage(error, "Could not update the report."), "error"),
  });
  const dismissFraudReport = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/fraud-reports/${id}`, { status: "DISMISSED" }),
    onSuccess: () => {
      invalidateFraudReports();
      toast("Fraud report dismissed.");
    },
    onError: (error) => toast(errorMessage(error, "Could not update the report."), "error"),
  });
  const fraudReportBusy = resolveFraudReport.isPending || dismissFraudReport.isPending;
  const fraudReports = fraudReportsQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.1 ) — Moderation"
        title="Nothing publishes unverified."
        lead="Each submission must have a confirmed organisation, a working source link and an official application method."
      />
      <DashNav items={ADMIN_NAV} />

      <section className="space-y-3 pb-14">
        {isUnauthenticated(queueQuery.error) ? (
          <Panel>
            <p className="text-sm text-muted">
              Sign in with a content officer, manager or admin account to see the moderation queue.
            </p>
          </Panel>
        ) : null}
        {queueQuery.isSuccess && items.length === 0 ? (
          <Panel>
            <p className="text-sm text-muted">Nothing waiting on review right now.</p>
          </Panel>
        ) : null}
        {items.map((m) => (
          <Panel key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Chip tone={toneFor[m.status] ?? "muted"}>{m.status}</Chip>
                  <span className="label-mono">Ref {m.reference}</span>
                </div>
                <h2 className="font-display text-xl tracking-tight">{m.title}</h2>
                <div className="mt-1 text-sm text-muted">
                  {m.organisationName} · {m.categoryName}
                  {m.region ? ` · ${m.region}` : ""}
                </div>
                {m.source ? <div className="mt-1 text-xs text-muted">Source: {m.source}</div> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {m.status === "PENDING_REVIEW" ? (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => approve.mutate(m.id)}
                      className="accent-gradient rounded-md px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const reason = window.prompt("What needs to change? The employer will see this.");
                        if (reason && reason.trim()) requestChanges.mutate({ id: m.id, reason: reason.trim() });
                      }}
                      className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                    >
                      Request changes
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const reason = window.prompt("Why is this listing being rejected? The employer will see this.");
                        if (reason && reason.trim()) reject.mutate({ id: m.id, reason: reason.trim() });
                      }}
                      className="rounded-md px-3 py-1.5 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => publish.mutate(m.id)}
                      className="accent-gradient rounded-md px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
                    >
                      Publish
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setSchedulingId(schedulingId === m.id ? null : m.id);
                        setScheduleAt("");
                      }}
                      className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                    >
                      Schedule
                    </button>
                  </>
                )}
              </div>
              {schedulingId === m.id ? (
                <div className="mt-3 flex basis-full flex-wrap items-center gap-2 border-t border-line pt-3">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="rounded-md bg-surface-2 px-3 py-1.5 text-xs outline-none ring-1 ring-line"
                  />
                  <button
                    type="button"
                    disabled={busy || !scheduleAt}
                    onClick={() => scheduleListing.mutate({ id: m.id, at: scheduleAt })}
                    className="accent-gradient rounded-md px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
                  >
                    Confirm schedule
                  </button>
                </div>
              ) : null}
            </div>
          </Panel>
        ))}
      </section>

      <section className="space-y-3 pb-14">
        <div className="eyebrow mb-1">Fraud &amp; scam reports</div>
        {isUnauthenticated(fraudReportsQuery.error) ? (
          <Panel>
            <p className="text-sm text-muted">
              Sign in with a content officer, manager or admin account to see fraud reports.
            </p>
          </Panel>
        ) : null}
        {fraudReportsQuery.isSuccess && fraudReports.length === 0 ? (
          <Panel>
            <p className="text-sm text-muted">No open fraud reports right now.</p>
          </Panel>
        ) : null}
        {fraudReports.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Chip tone="rose">{r.reason}</Chip>
                  {r.listingReference ? <span className="label-mono">Ref {r.listingReference}</span> : null}
                </div>
                {r.opportunityTitle ? (
                  <h2 className="font-display text-xl tracking-tight">{r.opportunityTitle}</h2>
                ) : null}
                {r.description ? <p className="mt-1 text-sm text-muted">{r.description}</p> : null}
                <div className="mt-1 text-xs text-muted">
                  {r.reporterName || r.reporterEmail
                    ? `Reported by ${[r.reporterName, r.reporterEmail].filter(Boolean).join(" · ")}`
                    : "Reported anonymously"}
                  {" · "}
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={fraudReportBusy}
                  onClick={() => resolveFraudReport.mutate(r.id)}
                  className="accent-gradient rounded-md px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
                >
                  Mark resolved
                </button>
                <button
                  disabled={fraudReportBusy}
                  onClick={() => dismissFraudReport.mutate(r.id)}
                  className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </section>
    </SiteShell>
  );
}
