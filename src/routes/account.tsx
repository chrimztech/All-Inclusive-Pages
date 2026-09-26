import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { PasswordInput } from "@/components/eoz/PasswordInput";
import { api, ApiError, type ApiUser } from "@/lib/api-client";
import { landingRouteFor, useCurrentUser } from "@/lib/use-current-user";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account & Security — EOZ" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AccountPage,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function AccountPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading, isSignedOut } = useCurrentUser();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: () => api.patch<ApiUser>("/auth/profile", { fullName, phone }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast("Profile updated.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update your profile.", "error"),
  });

  const savePreferences = useMutation({
    mutationFn: (next: { opportunityAlertsEnabled: boolean; serviceCommsEnabled: boolean }) =>
      api.patch<ApiUser>("/auth/notification-preferences", next),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast("Preferences saved.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save preferences.", "error"),
  });

  const changePassword = useMutation({
    mutationFn: () => api.post("/auth/change-password", { currentPassword, newPassword }),
    onSuccess: () => {
      queryClient.clear();
      toast("Password changed. Please sign in with your new password.");
      navigate({ to: "/auth", search: { mode: "signin" } });
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not change password.", "error"),
  });

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const forced = Boolean(user?.mustChangePassword);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="Account"
        title="Account & security."
        lead="Keep your details current and your password private. Only you should know your password."
      />

      {isSignedOut ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">
            <Link to="/auth" search={{ mode: "signin" }} className="text-accent-soft hover:text-fg">
              Sign in
            </Link>{" "}
            to manage your account.
          </p>
        </Panel>
      ) : null}

      {forced ? (
        <Panel className="mb-6 ring-1 ring-amber/40">
          <div className="flex items-start gap-3">
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber" />
            <div>
              <div className="font-medium">Choose your own password to continue</div>
              <p className="mt-1 text-sm text-muted">
                An administrator created your account with a one-time password. Enter it below as your current
                password, then choose a new one. You can use the rest of the platform once you have done this.
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-2">
        <Panel>
          <div className="label-mono">Change password</div>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (mismatch) return;
              changePassword.mutate();
            }}
          >
            <label>
              <span className="label-mono">{forced ? "One-time password" : "Current password"}</span>
              <PasswordInput
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputCls}
              />
            </label>
            <label>
              <span className="label-mono">New password</span>
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
              />
            </label>
            <label>
              <span className="label-mono">Confirm new password</span>
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
              />
            </label>
            {mismatch ? <p className="text-xs text-rose">The two passwords do not match.</p> : null}
            <p className="text-xs text-muted">At least 8 characters, and different from your current password.</p>
            <button
              type="submit"
              disabled={changePassword.isPending || mismatch || !currentPassword || newPassword.length < 8}
              className="press accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {changePassword.isPending ? "Changing…" : "Change password"}
            </button>
          </form>
        </Panel>

        {!forced ? (
          <div className="space-y-6">
            <Panel>
              <div className="label-mono">Profile</div>
              <form
                className="mt-4 grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveProfile.mutate();
                }}
              >
                <label>
                  <span className="label-mono">Full name</span>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                </label>
                <label>
                  <span className="label-mono">Email</span>
                  <input disabled value={user?.email ?? ""} className={`${inputCls} opacity-60`} />
                </label>
                <label>
                  <span className="label-mono">Phone</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                </label>
                <button
                  type="submit"
                  disabled={saveProfile.isPending || !fullName.trim()}
                  className="press accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                >
                  {saveProfile.isPending ? "Saving…" : "Save profile"}
                </button>
              </form>
            </Panel>

            <Panel>
              <div className="label-mono">Notifications</div>
              <div className="mt-4 space-y-4 text-sm">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={user?.opportunityAlertsEnabled ?? false}
                    disabled={isLoading || !user}
                    onChange={(e) =>
                      user &&
                      savePreferences.mutate({
                        opportunityAlertsEnabled: e.target.checked,
                        serviceCommsEnabled: user.serviceCommsEnabled,
                      })
                    }
                    className="mt-1 size-4 accent-accent"
                  />
                  <span>
                    <strong>Opportunity alerts</strong>
                    <br />
                    <span className="text-xs text-muted">Send relevant opportunity notifications.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={user?.serviceCommsEnabled ?? false}
                    disabled={isLoading || !user}
                    onChange={(e) =>
                      user &&
                      savePreferences.mutate({
                        opportunityAlertsEnabled: user.opportunityAlertsEnabled,
                        serviceCommsEnabled: e.target.checked,
                      })
                    }
                    className="mt-1 size-4 accent-accent"
                  />
                  <span>
                    <strong>Service communications</strong>
                    <br />
                    <span className="text-xs text-muted">Updates about orders and invoices.</span>
                  </span>
                </label>
              </div>
            </Panel>

            {user ? (
              <div className="flex flex-wrap gap-3 text-sm">
                <Link to={landingRouteFor(user)} className="text-accent-soft hover:text-fg">
                  Back to dashboard
                </Link>
                {user.roles.includes("CANDIDATE") ? (
                  <Link to="/candidate/account" className="text-accent-soft hover:text-fg">
                    Privacy, data export &amp; deletion
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </SiteShell>
  );
}
