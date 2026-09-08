import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, isUnauthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/candidate/notifications")({
  head: () => ({ meta: [{ title: "Notifications — EOZ Candidate Portal" }] }),
  component: Notifications,
});

type Notification = { id: string; type: string; title: string; body: string | null; read: boolean; createdAt: string };

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Notifications() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["candidate", "notifications"],
    queryFn: () => api.get<Notification[]>("/notifications/mine"),
    retry: false,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate", "notifications"] }),
  });

  const notifications = notificationsQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.5 ) — Notifications"
        title="Never miss a useful deadline."
        lead="Updates on your applications, alerts and service orders land here as well as by email."
      />
      <DashNav items={CANDIDATE_NAV} />
      <section className="pb-14">
        <Panel>
          <div className="label-mono">Recent alerts</div>
          {isUnauthenticated(notificationsQuery.error) ? (
            <p className="mt-4 text-sm text-muted">Sign in as a candidate to see your notifications.</p>
          ) : null}
          {notificationsQuery.isSuccess && notifications.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing yet — you'll see updates here as things happen.</p>
          ) : null}
          <div className="mt-4 space-y-3">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead.mutate(n.id)}
                className="flex w-full gap-3 border-t border-line pt-3 text-left first:border-0 first:pt-0"
              >
                <div className={`mt-1 size-2 shrink-0 rounded-full ${!n.read ? "bg-accent" : "bg-line"}`} />
                <div className="flex-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{n.title}</span>
                    <span className="text-xs text-muted">{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.body ? <p className="mt-1 text-xs text-muted">{n.body}</p> : null}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </section>
    </SiteShell>
  );
}
