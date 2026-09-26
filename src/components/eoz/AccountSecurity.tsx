import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { History, LogOut, Monitor, ShieldCheck } from "lucide-react";
import { Chip, Panel } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

type Session = {
  id: string;
  device: string;
  ipAddress: string | null;
  signedInAt: string;
  lastActiveAt: string;
  current: boolean;
};

type ConsentEvent = { type: string; granted: boolean; source: string; recordedAt: string };

const CONSENT_LABELS: Record<string, string> = {
  TERMS: "Terms of service",
  PRIVACY: "Privacy policy",
  OPPORTUNITY_ALERTS: "Opportunity alerts & reminders",
  SERVICE_COMMS: "Service & billing emails",
};

const SOURCE_LABELS: Record<string, string> = {
  REGISTRATION: "at sign-up",
  ACCOUNT_SETTINGS: "in account settings",
  MIGRATED_PREFERENCE: "carried over from earlier settings",
};

const lusaka = (iso: string) =>
  new Date(iso).toLocaleString("en-ZM", {
    timeZone: "Africa/Lusaka",
    dateStyle: "medium",
    timeStyle: "short",
  });

/** Every device signed in to this account, with sign-out for any one of them or all the others. */
export function SessionsPanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sessionsQuery = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => api.get<Session[]>("/auth/sessions"),
    retry: false,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
  const revoke = useMutation({
    mutationFn: (s: Session) => api.del(`/auth/sessions/${s.id}`),
    onSuccess: (_d, s) => {
      if (s.current) {
        queryClient.setQueryData(["me"], null);
        queryClient.clear();
        navigate({ to: "/auth", search: { mode: "signin" } });
        return;
      }
      refresh();
      toast("That device has been signed out.");
    },
    onError: (e) =>
      toast(e instanceof ApiError ? e.message : "Could not sign that session out.", "error"),
  });
  const revokeOthers = useMutation({
    mutationFn: () => api.post<number>("/auth/sessions/revoke-others"),
    onSuccess: (count) => {
      refresh();
      toast(
        count
          ? `Signed out ${count} other device${count === 1 ? "" : "s"}.`
          : "No other devices were signed in.",
      );
    },
    onError: (e) =>
      toast(e instanceof ApiError ? e.message : "Could not sign out other devices.", "error"),
  });

  const sessions = sessionsQuery.data ?? [];
  const others = sessions.filter((s) => !s.current).length;

  return (
    <Panel className="p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck aria-hidden="true" className="size-4 text-accent-soft" />
          Where you're signed in
        </div>
        {others > 0 ? (
          <button
            type="button"
            disabled={revokeOthers.isPending}
            onClick={() => {
              if (window.confirm(`Sign out ${others} other device${others === 1 ? "" : "s"}?`))
                revokeOthers.mutate();
            }}
            className="rounded-md px-2.5 py-1.5 text-xs text-rose ring-1 ring-rose/30 hover:bg-rose/10 disabled:opacity-60"
          >
            Sign out all other devices
          </button>
        ) : null}
      </div>
      <p className="mb-4 text-xs text-muted">
        Don't recognise a device? Sign it out, then change your password.
      </p>
      {sessionsQuery.isLoading ? <div className="skeleton h-16 rounded-xl" /> : null}
      {sessionsQuery.isError ? (
        <p className="text-xs text-rose">Could not load your sessions.</p>
      ) : null}
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3 ring-1 ring-line"
          >
            <Monitor aria-hidden="true" className="size-5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {s.device}
                {s.current ? <Chip tone="emerald">This device</Chip> : null}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                Signed in {lusaka(s.signedInAt)} · last active {lusaka(s.lastActiveAt)}
                {s.ipAddress ? ` · ${s.ipAddress}` : ""}
              </div>
            </div>
            <button
              type="button"
              aria-label={s.current ? "Sign out of this device" : `Sign out ${s.device}`}
              title={s.current ? "Sign out of this device" : "Sign out"}
              disabled={revoke.isPending}
              onClick={() => revoke.mutate(s)}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted ring-1 ring-line hover:bg-rose/10 hover:text-rose disabled:opacity-60"
            >
              <LogOut aria-hidden="true" className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** What this person agreed to and when, including every change since. */
export function ConsentHistoryPanel() {
  const consentsQuery = useQuery({
    queryKey: ["auth", "consents"],
    queryFn: () => api.get<ConsentEvent[]>("/auth/consents"),
    retry: false,
  });
  const events = consentsQuery.data ?? [];
  const current = new Map<string, ConsentEvent>();
  for (const e of events) if (!current.has(e.type)) current.set(e.type, e);

  return (
    <Panel className="p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <History aria-hidden="true" className="size-4 text-accent-soft" />
        Consent history
      </div>
      {consentsQuery.isLoading ? <div className="skeleton h-16 rounded-xl" /> : null}
      {current.size > 0 ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {[...current.values()].map((e) => (
            <div
              key={e.type}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs ring-1 ring-line"
            >
              <span>{CONSENT_LABELS[e.type] ?? e.type}</span>
              <Chip tone={e.granted ? "emerald" : "muted"}>
                {e.granted ? "Given" : "Withdrawn"}
              </Chip>
            </div>
          ))}
        </div>
      ) : null}
      <ol className="max-h-60 space-y-2 overflow-y-auto text-xs">
        {events.map((e, i) => (
          <li
            key={`${e.type}-${e.recordedAt}-${i}`}
            className="flex gap-2 border-l border-line pl-3"
          >
            <span className="text-muted">{lusaka(e.recordedAt)}</span>
            <span>
              {e.granted ? "Gave" : "Withdrew"} consent for {CONSENT_LABELS[e.type] ?? e.type}{" "}
              <span className="text-muted">
                {SOURCE_LABELS[e.source] ?? e.source.toLowerCase()}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted">
        Change alert and service-email consent with the notification settings on this page; each
        change is recorded here.
      </p>
    </Panel>
  );
}
