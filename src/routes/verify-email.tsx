import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, Panel } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>): { token?: string | undefined } => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  head: () => ({
    meta: [{ title: "Verify your email — Echo Opportunities Zambia" }, { name: "robots", content: "noindex" }],
  }),
  component: VerifyEmail,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function VerifyEmail() {
  const { token: tokenFromUrl } = Route.useSearch();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [token, setToken] = useState(tokenFromUrl ?? "");

  const mutation = useMutation({
    mutationFn: () => api.post("/auth/verify-email", { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
    onError: (error) => toast(error instanceof ApiError ? error.message : "This code is invalid or has expired.", "error"),
  });

  return (
    <SiteShell>
      <section className="mx-auto max-w-md py-14">
        <div className="eyebrow mb-4">( 10 ) — Access</div>
        <h1 className="font-display text-4xl tracking-tight">Verify your email</h1>
        <p className="mt-3 text-sm text-muted">
          Paste the verification code from your EOZ notification
          {user ? (
            <>
              {" "}
              (
              <Link to="/candidate/notifications" className="text-accent-soft hover:text-fg">
                check notifications
              </Link>
              )
            </>
          ) : null}
          .
        </p>

        <Panel className="mt-6">
          {mutation.isSuccess || user?.emailVerified ? (
            <p className="text-sm text-emerald-400">Your email is verified.</p>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <label>
                <span className="label-mono">Verification code</span>
                <input required value={token} onChange={(e) => setToken(e.target.value)} className={inputCls} />
              </label>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {mutation.isPending ? "Verifying…" : "Verify email"}
              </button>
            </form>
          )}
        </Panel>
      </section>
    </SiteShell>
  );
}
