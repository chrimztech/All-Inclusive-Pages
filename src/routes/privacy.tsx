import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro } from "@/components/eoz/SiteShell";
import { useOrgSettings } from "@/lib/use-org-settings";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "How Echo Opportunities Zambia collects, uses and protects personal data for candidates, employers and service clients.",
      },
      { property: "og:title", content: "Privacy Policy — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Data we hold, why we hold it, and how to request correction or deletion.",
      },
    ],
  }),
  component: Privacy,
});

const SECTIONS = [
  {
    t: "What we collect",
    b: "Account details (name, email, phone), your matching preferences, listings you save, and application progress you choose to record. Employers additionally provide organisation and contact details for verification.",
  },
  {
    t: "What we do not collect",
    b: "EOZ does not receive, store or forward your application to an employer. Documents you upload are stored for your own use and are never sent to third parties on your behalf.",
  },
  {
    t: "How we use data",
    b: "To match you with relevant opportunities, send deadline reminders you opted into, verify employers, and deliver any paid service you purchase.",
  },
  {
    t: "Sharing",
    b: "We do not sell personal data. Aggregate, non-identifying statistics may be published in platform reports.",
  },
  {
    t: "Retention",
    b: "Account data is retained while your account is active. Closing your account removes your profile and saved items; audit records of moderation actions are retained for accountability.",
  },
  {
    t: "Your rights",
    b: "You may request access, correction or deletion of your personal data at any time by contacting us.",
  },
];

function Privacy() {
  const org = useOrgSettings();
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 11 ) — Privacy"
        title="Privacy policy."
        lead={`How ${org.shortName} handles personal data for candidates, employers and service clients.`}
      />
      <section className="max-w-[70ch] space-y-8 pb-14">
        {SECTIONS.map((s, i) => (
          <div key={s.t}>
            <div className="label-mono mb-1">{String(i + 1).padStart(2, "0")}</div>
            <h2 className="font-display text-2xl tracking-tight">{s.t}</h2>
            <p className="mt-2 text-muted">{s.b}</p>
          </div>
        ))}
        <p className="text-sm text-muted">
          Questions about this policy: {org.email} · {org.phone}
        </p>
      </section>
    </SiteShell>
  );
}
