import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, Panel } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string | undefined } => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  head: () => ({
    meta: [{ title: "Set a new password — Echo Opportunities Zambia" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPassword,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function ResetPassword() {
  const { token: tokenFromUrl } = Route.useSearch();
  const { toast } = useToast();
  const [token, setToken] = useState(tokenFromUrl ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.post("/auth/reset-password", { token, newPassword }),
    onError: (error) => toast(error instanceof ApiError ? error.message : "Something went wrong.", "error"),
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-md py-14">
        <div className="eyebrow mb-4">( 10 ) — Access</div>
        <h1 className="font-display text-4xl tracking-tight">Set a new password</h1>
        <p className="mt-3 text-sm text-muted">Paste the code we sent you, then choose a new password.</p>

        <Panel className="mt-6">
          {mutation.isSuccess ? (
            <div className="text-sm">
              <p className="text-emerald-400">Password updated. Sign in with your new password.</p>
              <Link to="/auth" search={{ mode: "signin" }} className="mt-4 inline-block text-accent-soft">
                Go to sign in →
              </Link>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (newPassword !== confirmPassword) {
                  setMismatch(true);
                  return;
                }
                setMismatch(false);
                mutation.mutate();
              }}
            >
              <label>
                <span className="label-mono">Reset code</span>
                <input required value={token} onChange={(e) => setToken(e.target.value)} className={inputCls} />
              </label>
              <label>
                <span className="label-mono">New password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label>
                <span className="label-mono">Confirm new password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setMismatch(false);
                  }}
                  className={inputCls}
                />
              </label>
              {mismatch ? <p className="text-xs text-rose-400">Passwords do not match.</p> : null}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {mutation.isPending ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </Panel>

        <p className="mt-4 text-sm text-muted">
          <Link to="/forgot-password" className="text-accent-soft">
            ← Request a new code
          </Link>
        </p>
      </section>
    </SiteShell>
  );
}
