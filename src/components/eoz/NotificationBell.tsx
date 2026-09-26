import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api, type ApiNotification } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";

const UNREAD_KEY = ["notifications", "unread"] as const;

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

/** Where a notification should take its reader, based on what it is about and who they are. */
export function notificationLink(type: string, roles: string[]): string {
  const isCandidate = roles.includes("CANDIDATE");
  if (type === "APPLICATION_STATUS") return "/candidate/applications";
  if (type === "EMAIL_VERIFICATION") return "/verify-email";
  if (type === "PASSWORD_RESET") return "/account";
  if (type === "RESTORE_FLAGGED") return "/admin/health";
  if (type === "JOB_ALERT") return "/opportunities";
  if (type === "SECURITY_ALERT") return "/admin/audit";
  if (type === "ACCOUNT_LOCKED" || type === "SECURITY_NOTICE") return "/account";
  if (type === "DEADLINE_REMINDER") return "/candidate/saved";
  if (type.startsWith("OPPORTUNITY_")) return "/employers/listings";
  if (type === "SERVICE_ORDER_MESSAGE" || type === "SERVICE_QUOTE_ISSUED") {
    return isCandidate ? "/candidate/orders" : "/employers/services";
  }
  if (type === "PAYMENT_RECEIVED" || type === "INVOICE_CANCELLED" || type === "REFUND_ISSUED") {
    return isCandidate ? "/candidate/orders" : "/employers/finance";
  }
  return "/notifications";
}

export function useNotificationActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["candidate", "notifications"] });
  };
  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: refresh,
  });
  const markAllRead = useMutation({
    mutationFn: () => api.post<number>("/notifications/mine/read-all"),
    onSuccess: refresh,
  });
  return { markRead, markAllRead };
}

export function NotificationBell() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { markRead, markAllRead } = useNotificationActions();

  const unreadQuery = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => api.get<number>("/notifications/mine/unread-count"),
    enabled: Boolean(user),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const latestQuery = useQuery({
    queryKey: ["notifications", "latest"],
    queryFn: () => api.get<ApiNotification[]>("/notifications/mine", { limit: 8 }),
    enabled: Boolean(user) && open,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!user) return null;

  const unread = unreadQuery.data ?? 0;
  const items = latestQuery.data ?? [];

  const openItem = (n: ApiNotification) => {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    navigate({ to: notificationLink(n.type, user.roles) });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="press relative flex size-10 items-center justify-center rounded-full text-muted ring-1 ring-line transition-all hover:bg-white/[0.05] hover:text-fg hover:ring-accent/30"
      >
        <Bell aria-hidden="true" className={`size-[18px] ${unread ? "text-fg" : ""}`} />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose px-1 font-mono text-[10px] leading-none font-semibold text-white ring-2 ring-ink">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="glass-strong fade-in z-50 overflow-hidden rounded-xl text-sm ring-1 ring-line max-sm:fixed max-sm:inset-x-3 max-sm:top-[72px] sm:absolute sm:right-0 sm:mt-2 sm:w-[22rem]"
          style={{ backgroundColor: "rgba(8,29,18,0.96)" }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="font-medium">
              Notifications
              {unread ? <span className="ml-2 text-xs text-muted">{unread} unread</span> : null}
            </div>
            <button
              type="button"
              disabled={!unread || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent-soft transition-colors hover:bg-white/5 disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
            >
              <CheckCheck aria-hidden="true" className="size-3.5" />
              Mark all read
            </button>
          </div>

          <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
            {latestQuery.isLoading
              ? Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="space-y-2 px-4 py-3">
                    <div className="skeleton h-3 w-2/3 rounded" />
                    <div className="skeleton h-2.5 w-full rounded" />
                  </li>
                ))
              : items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] ${n.read ? "" : "bg-accent/[0.05]"}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent-soft shadow-[0_0_8px_rgba(124,227,164,0.7)]"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate ${n.read ? "text-muted" : "font-medium text-fg"}`}
                        >
                          {n.title}
                        </span>
                        {n.body ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted">
                            {n.body}
                          </span>
                        ) : null}
                        <span className="mt-1 block font-mono text-[10px] text-muted">
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
            {!latestQuery.isLoading && items.length === 0 ? (
              <li className="px-4 py-10 text-center">
                <Bell aria-hidden="true" className="mx-auto size-6 text-muted/60" />
                <p className="mt-2 text-muted">You're all caught up.</p>
              </li>
            ) : null}
            {latestQuery.isError ? (
              <li className="px-4 py-6 text-center text-xs text-rose">
                Could not load notifications.
              </li>
            ) : null}
          </ul>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-xs text-accent-soft transition-colors hover:bg-white/[0.04]"
          >
            View all notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** Full notification list with an unread filter and mark-all-read; used by the notification pages. */
export function NotificationFeed() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { markRead, markAllRead } = useNotificationActions();
  const feedQuery = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => api.get<ApiNotification[]>("/notifications/mine"),
    enabled: Boolean(user),
    retry: false,
  });

  if (!user) {
    return <p className="text-sm text-muted">Sign in to see your notifications.</p>;
  }

  const all = feedQuery.data ?? [];
  const unread = all.filter((n) => !n.read).length;
  const shown = unreadOnly ? all.filter((n) => !n.read) : all;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-white/[0.03] p-1 text-xs ring-1 ring-line">
          {[
            { v: false, l: `All (${all.length})` },
            { v: true, l: `Unread (${unread})` },
          ].map((tab) => (
            <button
              key={tab.l}
              type="button"
              aria-pressed={unreadOnly === tab.v}
              onClick={() => setUnreadOnly(tab.v)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${unreadOnly === tab.v ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg"}`}
            >
              {tab.l}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!unread || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
        >
          <CheckCheck aria-hidden="true" className="size-3.5" />
          Mark all read
        </button>
      </div>

      {feedQuery.isLoading ? <div className="skeleton h-24 rounded-xl" /> : null}
      {feedQuery.isError ? (
        <p className="text-sm text-rose">Could not load notifications.</p>
      ) : null}
      {feedQuery.isSuccess && shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {unreadOnly
            ? "No unread notifications."
            : "Nothing yet — updates will appear here as things happen."}
        </p>
      ) : null}

      <ul className="divide-y divide-line">
        {shown.map((n) => (
          <li key={n.id} className="flex gap-3 py-3.5">
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-line" : "bg-accent-soft shadow-[0_0_8px_rgba(124,227,164,0.7)]"}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className={`text-sm ${n.read ? "text-muted" : "font-medium text-fg"}`}>
                  {n.title}
                </span>
                <span className="font-mono text-[10px] text-muted">{timeAgo(n.createdAt)}</span>
              </div>
              {n.body ? <p className="mt-1 text-xs leading-5 text-muted">{n.body}</p> : null}
              <div className="mt-2 flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read) markRead.mutate(n.id);
                    navigate({ to: notificationLink(n.type, user.roles) });
                  }}
                  className="text-accent-soft hover:text-fg"
                >
                  Open →
                </button>
                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(n.id)}
                    className="text-muted hover:text-fg"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
