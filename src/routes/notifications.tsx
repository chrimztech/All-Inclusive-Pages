import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { NotificationFeed } from "@/components/eoz/NotificationBell";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Echo Opportunities Zambia" },
      {
        name: "description",
        content: "Updates on your applications, listings, service orders and account.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="Notifications"
        title="Everything that needs your attention."
        lead="Updates on applications, listings, service orders and your account — also sent by email."
      />
      <section className="pb-14">
        <Panel className="p-6">
          <NotificationFeed />
        </Panel>
      </section>
    </SiteShell>
  );
}
