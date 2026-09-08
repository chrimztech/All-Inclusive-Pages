import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, Panel } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset your password — Echo Opportunities Zambia" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPassword,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/auth/forgot-password", { email }),
    onError: (error) => toast(error instanceof ApiError ? error.message : "Something went wrong.", "error"),
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-md py-14">
        <div className="eyebrow mb-4">( 10 ) — Access</div>
        <h1 className="font-display text-4xl tracking-tight">Reset your password</h1>
        <p className="mt-3 text-sm text-muted">
          Enter the email on your account. If it's registered, we'll send a reset code.
        </p>

        <Panel className="mt-6">
          {mutation.isSuccess ? (
            <div className="text-sm">
              <p className="text-emerald-400">
                If that email is registered, a reset code has been sent.
              </p>
              <Link to="/reset-password" className="mt-4 inline-block text-accent-soft">
                I have a code →
              </Link>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <label>
                <span className="label-mono">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </label>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {mutation.isPending ? "Sending…" : "Send reset code"}
              </button>
            </form>
          )}
        </Panel>

        <p className="mt-4 text-sm text-muted">
          <Link to="/auth" search={{ mode: "signin" }} className="text-accent-soft">
            ← Back to sign in
          </Link>
        </p>
      </section>
    </SiteShell>
  );
}
