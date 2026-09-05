import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { ORG } from "@/lib/eoz-data";

export const Route = createFileRoute("/employers/applicants")({
  head: () => ({
    meta: [
      { title: "Applicant Interest — EOZ Employer Portal" },
      {
        name: "description",
        content:
          "See referral interest for each listing. Applications themselves arrive through your own official channel.",
      },
      { property: "og:title", content: "Applicant Interest — EOZ Employer Portal" },
      {
        property: "og:description",
        content: "Referral analytics per listing, with applications handled on your own channel.",
      },
    ],
  }),
  component: Applicants,
});

const ROWS = [
  { role: "Senior Data Analyst", referrals: 312, saved: 128, region: "Lusaka", trend: "+18%" },
  { role: "Engineering Intern — Civil Structures", referrals: 204, saved: 96, region: "Copperbelt", trend: "+7%" },
  { role: "Programme Officer — Youth Livelihoods", referrals: 173, saved: 61, region: "Central", trend: "-4%" },
  { role: "Graduate Trainee Programme 2026", referrals: 519, saved: 240, region: "Lusaka", trend: "+31%" },
];

function Applicants() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.3 ) — Applicants"
        title="Interest, not inboxes."
        lead="EOZ shows you how many candidates reached your official application channel. Their applications go straight to you."
      />
      <DashNav items={EMPLOYER_NAV} />

      <Panel className="mb-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="label-mono">
              <th className="pb-3">Listing</th>
              <th className="pb-3">Region</th>
              <th className="pb-3">Referrals</th>
              <th className="pb-3">Saves</th>
              <th className="pb-3">Trend</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.role} className="border-t border-line">
                <td className="py-3 pr-4">{r.role}</td>
                <td className="py-3 pr-4 text-muted">{r.region}</td>
                <td className="py-3 pr-4">{r.referrals}</td>
                <td className="py-3 pr-4 text-muted">{r.saved}</td>
                <td className="py-3">
                  <Chip tone={r.trend.startsWith("+") ? "emerald" : "rose"}>{r.trend}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="mb-14">
        <p className="text-xs text-muted">{ORG.disclaimer}</p>
      </Panel>
    </SiteShell>
  );
}
