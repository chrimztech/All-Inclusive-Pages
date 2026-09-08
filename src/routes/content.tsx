import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { CONTENT_SERIES, ORG } from "@/lib/eoz-data";
import { useOrgSettings, type OrgSettings } from "@/lib/use-org-settings";

export const Route = createFileRoute("/content")({
  head: () => ({
    meta: [
      { title: "Content & Channels — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Follow EOZ for opportunities, career guidance, HR information, education content and practical business support across WhatsApp and social channels.",
      },
      { property: "og:title", content: "Content & Channels — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content:
          "Useful opportunity, career and professional content from Echo Opportunities Zambia.",
      },
    ],
  }),
  component: Content,
});

function channels(social: OrgSettings["social"]) {
  return [
    {
      label: "WhatsApp Channel",
      note: "Full opportunity posts and deadline updates",
      href: social.whatsapp,
      tone: "accent" as const,
    },
    {
      label: "Facebook",
      note: "Community updates and selected opportunity summaries",
      href: social.facebook,
      tone: "emerald" as const,
    },
    {
      label: "LinkedIn",
      note: "Professional, HR and employer-focused content",
      href: social.linkedin,
      tone: "amber" as const,
    },
    {
      label: "TikTok",
      note: "Short career, employability and education content",
      href: social.tiktok,
      tone: "rose" as const,
    },
  ];
}

function Content() {
  const org = useOrgSettings();
  const CHANNELS = channels(org.social);
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 11 ) — Content & Channels"
        title="Useful information, wherever you find it."
        lead="EOZ combines opportunity distribution with practical career, employability, education and business content for people and organisations across Zambia."
        aside={
          <Panel>
            <Chip tone="accent">Official channel</Chip>
            <p className="mt-3 text-sm text-muted">{ORG.whatsappWording}:</p>
            <a
              href={org.social.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all text-xs text-accent-soft hover:text-fg"
            >
              {org.social.whatsapp}
            </a>
          </Panel>
        }
      />

      <section className="pb-10">
        <div className="eyebrow mb-4">A recurring rhythm</div>
        <div className="grid gap-4 lg:grid-cols-3">
          {CONTENT_SERIES.map((series, index) => (
            <Panel key={series.time}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-accent-soft">0{index + 1}</span>
                <Chip tone={index === 1 ? "amber" : "muted"}>{series.time}</Chip>
              </div>
              <h2 className="mt-4 font-display text-2xl tracking-tight">{series.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{series.description}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <div className="label-mono mb-3">What to expect</div>
          <ul className="space-y-3 text-sm text-muted">
            <li>
              Opportunity posts identify the organisation, requirements, location, deadline and
              official application route.
            </li>
            <li>
              WhatsApp versions may include the full employer route; Facebook versions may direct
              users to the EOZ channel according to policy.
            </li>
            <li>
              Career and education content is practical, accessible and separate from any employer
              selection decision.
            </li>
            <li>
              EOZ never claims to have selected candidates unless an EOZ-managed recruitment
              engagement exists and is approved.
            </li>
          </ul>
        </Panel>
        <Panel className="lg:col-span-5">
          <div className="label-mono mb-3">Follow the network</div>
          <div className="space-y-3">
            {CHANNELS.map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg p-3 ring-1 ring-line transition-colors hover:ring-accent/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">{channel.label}</span>
                  <Chip tone={channel.tone}>Open channel</Chip>
                </div>
                <div className="mt-1 text-xs text-muted">{channel.note}</div>
              </a>
            ))}
          </div>
        </Panel>
      </section>

      <Panel className="mb-14 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="label-mono">Looking for an opportunity?</div>
          <p className="mt-1 text-sm text-muted">
            Browse the verified board and use the advertiser&apos;s official route.
          </p>
        </div>
        <Link
          to="/opportunities"
          className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
        >
          Browse opportunities
        </Link>
      </Panel>
    </SiteShell>
  );
}
