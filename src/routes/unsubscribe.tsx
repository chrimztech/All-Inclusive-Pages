import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, BellRing, MailX } from "lucide-react";
import { Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>): { token?: string | undefined } => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Email preferences — Echo Opportunities Zambia" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Unsubscribe,
});

type Scope = "ALERTS" | "SERVICE" | "ALL";
type Status = {
  scope: Scope;
  maskedEmail: string;
  alertsEnabled: boolean;
  serviceEnabled: boolean;
};

const WHAT: Record<Scope, string> = {
  ALERTS: "job alert and deadline reminder emails",
  SERVICE: "professional-service and billing update emails",
  ALL: "job alerts and service update emails",
};

function isOn(s: Status) {
  if (s.scope === "ALERTS") return s.alertsEnabled;
  if (s.scope === "SERVICE") return s.serviceEnabled;
  return s.alertsEnabled || s.serviceEnabled;
}

function Unsubscribe() {
  const { token } = Route.useSearch();
  const queryClient = useQueryClient();
  const q = token ? `?token=${encodeURIComponent(token)}` : "";

  // Loading the page never changes anything: link scanners open email links automatically.
  const statusQuery = useQuery({
    queryKey: ["unsubscribe", token],
    queryFn: () => api.get<Status>("/unsubscribe", { token }),
    enabled: !!token,
    retry: false,
  });
  const onSaved = (s: Status) => {
    queryClient.setQueryData(["unsubscribe", token], s);
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };
  const unsubscribe = useMutation({
    mutationFn: () => api.post<Status>(`/unsubscribe${q}`),
    onSuccess: onSaved,
  });
  const undo = useMutation({
    mutationFn: () => api.post<Status>(`/unsubscribe/undo${q}`),
    onSuccess: onSaved,
  });

  const status = statusQuery.data;
  const error = statusQuery.error ?? unsubscribe.error ?? undo.error;

  return (
    <SiteShell>
      <section className="mx-auto max-w-lg py-14">
        <div className="eyebrow mb-4">( 10 ) — Email preferences</div>
        <h1 className="font-display text-4xl tracking-tight">Unsubscribe</h1>

        <Panel className="mt-6 p-6">
          {!token ? (
            <p className="text-sm text-muted">
              This page needs the link from one of our emails. You can also change what we email you
              from your{" "}
              <Link to="/account" className="text-accent-soft hover:text-fg">
                account settings
              </Link>
              .
            </p>
          ) : statusQuery.isLoading ? (
            <div className="skeleton h-24 rounded-xl" aria-label="Loading" />
          ) : error && !status ? (
            <div role="alert" className="flex gap-3 text-sm">
              <MailX aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-rose" />
              <p>
                {error instanceof ApiError ? error.message : "Something went wrong. Try again."}{" "}
                <Link to="/account" className="text-accent-soft hover:text-fg">
                  Go to account settings
                </Link>
              </p>
            </div>
          ) : status ? (
            isOn(status) ? (
              <div className="grid gap-4">
                <div className="flex gap-3">
                  <BellRing
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-accent-soft"
                  />
                  <p className="text-sm leading-6">
                    Stop sending <strong>{WHAT[status.scope]}</strong> to{" "}
                    <span className="font-mono">{status.maskedEmail}</span>?
                  </p>
                </div>
                <p className="text-xs leading-5 text-muted">
                  Security emails, such as sign-in alerts and password resets, will still be sent.
                  Notifications inside your EOZ account are not affected.
                </p>
                <button
                  type="button"
                  disabled={unsubscribe.isPending}
                  onClick={() => unsubscribe.mutate()}
                  className="btn-primary justify-self-start px-4 py-2 text-sm disabled:opacity-60"
                >
                  {unsubscribe.isPending ? "Unsubscribing…" : "Unsubscribe"}
                </button>
              </div>
            ) : (
              <div className="grid gap-4" aria-live="polite">
                <div className="flex gap-3">
                  <BellOff aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                  <p className="text-sm leading-6">
                    You're unsubscribed. We won't send <strong>{WHAT[status.scope]}</strong> to{" "}
                    <span className="font-mono">{status.maskedEmail}</span>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <button
                    type="button"
                    disabled={undo.isPending}
                    onClick={() => undo.mutate()}
                    className="btn-secondary px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {undo.isPending ? "Resubscribing…" : "Undo — keep sending them"}
                  </button>
                  <Link to="/account" className="text-accent-soft hover:text-fg">
                    All email preferences
                  </Link>
                </div>
              </div>
            )
          ) : null}
          {error && status ? (
            <p role="alert" className="mt-4 text-sm text-rose">
              {error instanceof ApiError ? error.message : "Could not save. Try again."}
            </p>
          ) : null}
        </Panel>
      </section>
    </SiteShell>
  );
}
