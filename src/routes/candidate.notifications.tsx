import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";

export const Route = createFileRoute("/candidate/notifications")({
  head: () => ({ meta: [{ title: "Notifications — EOZ Candidate Portal" }] }),
  component: Notifications,
});

function Notifications() {
  return <SiteShell><PageIntro eyebrow="( 04.5 ) — Notifications" title="Never miss a useful deadline." lead="Control the alerts you receive and keep your inbox focused on opportunities that match your profile." /><DashNav items={CANDIDATE_NAV} /><section className="grid gap-6 pb-14 lg:grid-cols-12"><Panel className="lg:col-span-7"><div className="label-mono">Recent alerts</div><div className="mt-4 space-y-3">{[['New match','Senior Data Analyst matches your profile','Today'],['Deadline reminder','Solar Units tender closes in 5 days','Yesterday'],['Saved listing update','Graduate Trainee Programme is still open','3 days ago']].map(([title, text, time], i) => <div key={title} className="flex gap-3 border-t border-line pt-3 first:border-0 first:pt-0"><div className={`mt-1 size-2 rounded-full ${i === 0 ? 'bg-accent' : 'bg-line'}`} /><div className="flex-1"><div className="flex justify-between gap-3 text-sm"><span>{title}</span><span className="text-xs text-muted">{time}</span></div><p className="mt-1 text-xs text-muted">{text}</p></div></div>)}</div></Panel><Panel className="lg:col-span-5"><div className="label-mono">Alert preferences</div><div className="mt-4 space-y-4 text-sm">{[['Instant matches',true],['Daily deadline digest',true],['Weekly opportunities',false],['Service updates',true]].map(([label, checked]) => <label key={String(label)} className="flex items-center justify-between gap-3"><span>{label}</span><input type="checkbox" defaultChecked={Boolean(checked)} className="size-4 accent-accent" /></label>)}<div className="border-t border-line pt-4"><Chip tone="muted">Africa/Lusaka · email</Chip></div></div></Panel></section></SiteShell>;
}
