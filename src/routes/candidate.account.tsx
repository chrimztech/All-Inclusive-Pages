import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/candidate/account")({
  head: () => ({ meta: [{ title: "Account & Privacy — EOZ" }] }),
  component: Account,
});

function Account() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isSignedOut } = useCurrentUser();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [serviceCommsEnabled, setServiceCommsEnabled] = useState(true);
  const [exportedData, setExportedData] = useState<unknown>(null);
  const [deletionRequested, setDeletionRequested] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  useEffect(() => {
    if (user) {
      setAlertsEnabled(user.opportunityAlertsEnabled);
      setServiceCommsEnabled(user.serviceCommsEnabled);
    }
  }, [user]);

  const savePreferences = useMutation({
    mutationFn: (next: { opportunityAlertsEnabled: boolean; serviceCommsEnabled: boolean }) =>
      api.patch("/auth/notification-preferences", next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast("Preferences saved.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save preferences.", "error"),
  });

  const changePassword = useMutation({
    mutationFn: () => api.post("/auth/change-password", { currentPassword, newPassword }),
    onSuccess: () => {
      queryClient.clear();
      toast("Password changed. Please sign in again.");
      navigate({ to: "/auth", search: { mode: "signin" } });
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not change password.", "error"),
  });

  const exportData = useMutation({
    mutationFn: () => api.get("/candidate/privacy/export"),
    onSuccess: (data) => {
      setExportedData(data);
      toast("Export ready to download.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Export failed.", "error"),
  });

  const requestDeletion = useMutation({
    mutationFn: () => api.post("/candidate/privacy/delete-request"),
    onSuccess: () => {
      setDeletionRequested(true);
      toast("Deletion requested.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not submit request.", "error"),
  });

  function downloadExport() {
    if (!exportedData) return;
    const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eoz-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.6 ) — Account & Privacy"
        title="You stay in control of your data."
        lead="Review consent, export your information or request account deletion. These actions do not delete public opportunity history."
      />
      <DashNav items={CANDIDATE_NAV} />

      {isSignedOut ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in to manage your account and privacy settings.</p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-2">
        <Panel>
          <div className="label-mono">Privacy controls</div>
          <div className="mt-4 space-y-4 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setAlertsEnabled(next);
                  savePreferences.mutate({ opportunityAlertsEnabled: next, serviceCommsEnabled });
                }}
                className="mt-1 size-4 accent-accent"
              />
              <span>
                <strong>Opportunity alerts</strong>
                <br />
                <span className="text-xs text-muted">Use my preferences to send relevant opportunity notifications.</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={serviceCommsEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setServiceCommsEnabled(next);
                  savePreferences.mutate({ opportunityAlertsEnabled: alertsEnabled, serviceCommsEnabled: next });
                }}
                className="mt-1 size-4 accent-accent"
              />
              <span>
                <strong>Service communications</strong>
                <br />
                <span className="text-xs text-muted">Send updates about orders I have requested.</span>
              </span>
            </label>
            <p className="text-xs text-muted">
              Manage which categories you're alerted on from the{" "}
              <a href="/candidate/alerts" className="text-accent-soft hover:text-fg">
                Alerts page
              </a>
              .
            </p>
          </div>
        </Panel>
        <Panel>
          <div className="label-mono">Change password</div>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (newPassword !== confirmPassword) {
                setPasswordMismatch(true);
                return;
              }
              setPasswordMismatch(false);
              changePassword.mutate();
            }}
          >
            <label className="text-sm">
              <span className="label-mono">Current password</span>
              <input
                required
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
              />
            </label>
            <label className="text-sm">
              <span className="label-mono">New password</span>
              <input
                required
                minLength={8}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
              />
            </label>
            <label className="text-sm">
              <span className="label-mono">Confirm new password</span>
              <input
                required
                minLength={8}
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordMismatch(false);
                }}
                className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
              />
            </label>
            {passwordMismatch ? <p className="text-xs text-rose-400">Passwords do not match.</p> : null}
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 justify-self-start"
            >
              {changePassword.isPending ? "Saving…" : "Change password"}
            </button>
            <p className="text-xs text-muted">You'll be signed out on other devices after this change.</p>
          </form>
        </Panel>
        <Panel>
          <div className="label-mono">Data requests</div>
          <div className="mt-4 space-y-3">
            <button
              onClick={() => exportData.mutate()}
              disabled={exportData.isPending}
              className="block w-full rounded-md px-3 py-2 text-left text-sm ring-1 ring-line hover:text-accent-soft disabled:opacity-60"
            >
              {exportData.isPending ? "Preparing export…" : "Request a data export"}
              <span className="float-right text-muted">→</span>
            </button>
            {exportedData ? (
              <button
                onClick={downloadExport}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-emerald-400 ring-1 ring-emerald/30"
              >
                Download your export (.json)
              </button>
            ) : null}

            {deletionRequested ? (
              <p className="rounded-md bg-surface-2 p-3 text-xs text-muted">
                Deletion requested. Your account has been deactivated pending review against retention and legal
                requirements — we'll email you before completion.
              </p>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm("This deactivates your account immediately, pending review. Continue?")) {
                    requestDeletion.mutate();
                  }
                }}
                disabled={requestDeletion.isPending}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-rose ring-1 ring-rose/30 disabled:opacity-60"
              >
                {requestDeletion.isPending ? "Submitting…" : "Request account deletion"}
                <span className="float-right">→</span>
              </button>
            )}
            <p className="text-xs text-muted">
              Requests are reviewed against retention and legal requirements. We will email you before completion.
            </p>
          </div>
        </Panel>
      </section>
    </SiteShell>
  );
}
