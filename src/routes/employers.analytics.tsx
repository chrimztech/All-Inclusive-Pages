import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV, StatTile } from "@/components/eoz/DashNav";

export const Route = createFileRoute("/employers/analytics")({
  head: () => ({ meta: [{ title: "Employer Analytics — EOZ" }] }),
  component: Analytics,
});
function Analytics() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.5 ) — Analytics"
        title="See how your opportunities travel."
        lead="EOZ reports distribution and referral activity. Applications remain on your official channel and are not counted here."
      />
      <DashNav items={EMPLOYER_NAV} />
      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total views" value="9,412" />
        <StatTile label="Official referrals" value="1,208" />
        <StatTile label="Save rate" value="8.6%" />
        <StatTile label="Best category" value="Jobs" />
      </div>
      <section className="grid gap-6 pb-14 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <div className="label-mono">Views and referrals · last 30 days</div>
          <div className="mt-6 flex h-48 items-end gap-2">
            {[38, 52, 44, 68, 60, 78, 72, 88, 64, 92, 76, 100, 84, 96].map((height, i) => (
              <div key={i} className="group flex flex-1 flex-col justify-end gap-2">
                <div
                  className="w-full rounded-t bg-accent/70 transition-all group-hover:bg-amber"
                  style={{ height: `${height}%` }}
                />
                <div className="text-center text-[9px] text-muted">{i + 1}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="lg:col-span-2">
          <div className="label-mono">Top listings</div>
          <div className="mt-4 space-y-4">
            {(
              [
                ["Senior Data Analyst", "3,420 views"],
                ["Graduate Trainee Programme", "2,180 views"],
                ["Engineering Intern", "1,645 views"],
              ] as const
            ).map(([name, views]) => (
              <div key={name}>
                <div className="text-sm">{name}</div>
                <div className="mt-1 text-xs text-muted">{views}</div>
                <div className="mt-2 h-1 rounded-full bg-line">
                  <div
                    className="h-1 rounded-full bg-accent"
                    style={{ width: `${Math.max(38, 100 - name.length * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </SiteShell>
  );
}
