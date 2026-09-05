import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck, BriefcaseBusiness, FileCheck2, ShieldCheck } from "lucide-react";
import { PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/candidates")({
  head: () => ({
    meta: [
      { title: "For Candidates - Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Build your profile, find verified opportunities, track applications and access career support with EOZ.",
      },
    ],
  }),
  component: Candidates,
});

const BENEFITS = [
  {
    icon: BriefcaseBusiness,
    title: "Find the right opportunities",
    text: "Search jobs, internships, scholarships, grants and training by location, deadline and work mode.",
  },
  {
    icon: ShieldCheck,
    title: "Use the official route",
    text: "Every listing clearly separates the employer's application method from EOZ support and professional services.",
  },
  {
    icon: FileCheck2,
    title: "Stay organised",
    text: "Save listings, set deadline alerts and keep a private record of applications you make with employers.",
  },
  {
    icon: BookOpenCheck,
    title: "Strengthen your application",
    text: "Order optional CV, cover letter, LinkedIn and interview services without implying an application was submitted.",
  },
];

function Candidates() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="Candidates & job seekers"
        title="A clearer path from discovery to decision."
        lead="EOZ brings trusted opportunities and practical career tools together, while keeping you in control of where and how you apply."
        aside={
          <Panel>
            <div className="label-mono">Your next step</div>
            <p className="mt-2 text-sm text-muted">
              Create a private profile to save opportunities, receive alerts and track your
              progress.
            </p>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="accent-gradient mt-4 inline-flex rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Create candidate account
            </Link>
          </Panel>
        }
      />

      <section className="grid gap-4 pb-10 md:grid-cols-2">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <Panel key={title}>
            <Icon aria-hidden="true" className="size-5 text-accent-soft" />
            <h2 className="mt-4 font-display text-2xl tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
          </Panel>
        ))}
      </section>

      <section className="mb-14 grid gap-4 lg:grid-cols-3">
        {[
          [
            "01",
            "Discover",
            "Browse verified listings and compare requirements before sharing personal information.",
          ],
          [
            "02",
            "Apply",
            "Follow the employer-approved link, email or physical submission instructions on the listing.",
          ],
          [
            "03",
            "Track",
            "Record the application in your portal and follow interviews, deadlines and decisions.",
          ],
        ].map(([step, title, text]) => (
          <Panel key={step}>
            <div className="label-mono">Step {step}</div>
            <h2 className="mt-2 font-display text-xl">{title}</h2>
            <p className="mt-2 text-sm text-muted">{text}</p>
          </Panel>
        ))}
      </section>
    </SiteShell>
  );
}
