import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { NotificationFeed } from "@/components/eoz/NotificationBell";

export const Route = createFileRoute("/candidate/notifications")({
  head: () => ({ meta: [{ title: "Notifications — EOZ Candidate Portal" }] }),
  component: Notifications,
});

function Notifications() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.5 ) — Notifications"
        title="Never miss a useful deadline."
        lead="Updates on your applications, alerts and service orders land here as well as by email."
      />
      <DashNav items={CANDIDATE_NAV} />
      <section className="pb-14">
        <Panel className="p-6">
          <NotificationFeed />
        </Panel>
      </section>
    </SiteShell>
  );
}
