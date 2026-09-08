import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { AUDIENCES, BRAND_VALUES, ORG, PILLARS, WHY_CHOOSE_EOZ } from "@/lib/eoz-data";
import { useOrgSettings } from "@/lib/use-org-settings";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About EOZ — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Echo Opportunities Zambia connects people and organisations to employment, education, entrepreneurship and professional support opportunities across Zambia.",
      },
      { property: "og:title", content: "About EOZ — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Who we are, what we distribute, and why applications always stay with the employer.",
      },
    ],
  }),
  component: About,
});

function About() {
  const org = useOrgSettings();
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 08 ) — About"
        title={<>Connecting talent.<br />Creating opportunities.</>}
        lead={`${org.name} is a Zambian recruitment and professional services agency/platform. We connect people and organisations to meaningful opportunities, reliable information and practical support.`}
      />

      <section className="grid gap-6 pb-10 lg:grid-cols-12">
        <div className="space-y-5 text-muted lg:col-span-7">
          <p>
            EOZ exists because good opportunities in Zambia are scattered — buried in newspapers,
            noticeboards, closed WhatsApp groups and websites nobody checks. We collect them, check
            the source, and publish them in one place with the deadline stated plainly.
          </p>
          <p>
            We are a distributor and curator, not an intermediary. Whatever the employer, funder or
            institution says is their application method is the only application method. We publish
            it, we link to it, and we stay out of the way.
          </p>
          <p>
            Alongside free distribution, our team offers paid professional services — CV writing,
            cover letters, interview coaching, LinkedIn optimisation, company profiles and
            recruitment support — for people and organisations who want direct help.
          </p>
        </div>
        <aside className="space-y-4 lg:col-span-5">
          <Panel>
            <div className="label-mono mb-3">Organisation</div>
            <dl className="space-y-2 text-sm">
              <Row k="Name" v={org.name} />
              <Row k="Short name" v={org.shortName} />
              <Row k="Location" v={org.location} />
              <Row k="Phone" v={org.phone} />
              <Row k="Email" v={org.email} />
            </dl>
          </Panel>
          <Panel>
            <div className="label-mono mb-2">Our promise</div>
            <p className="text-xs text-muted">{ORG.disclaimer}</p>
          </Panel>
        </aside>
      </section>

      <section className="grid gap-4 pb-10 lg:grid-cols-2">
        <Panel>
          <div className="label-mono mb-2">Our vision</div>
          <p className="text-sm leading-6 text-muted">{ORG.vision}</p>
        </Panel>
        <Panel>
          <div className="label-mono mb-2">Our mission</div>
          <p className="text-sm leading-6 text-muted">{ORG.mission}</p>
        </Panel>
      </section>

      <section className="pb-10">
        <div className="eyebrow mb-4">The five EOZ pillars</div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Panel key={pillar.title}>
              <div className="font-mono text-xs text-amber">0{index + 1}</div>
              <h2 className="mt-2 font-display text-xl tracking-tight">{pillar.title}</h2>
              <p className="mt-2 text-sm text-muted">{pillar.description}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="grid gap-6 pb-10 lg:grid-cols-2">
        <Panel>
          <div className="label-mono mb-3">Who we serve</div>
          <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
            {AUDIENCES.map((audience) => <li key={audience}>· {audience}</li>)}
          </ul>
        </Panel>
        <Panel>
          <div className="label-mono mb-3">Operating principles</div>
          <div className="flex flex-wrap gap-2">
            {BRAND_VALUES.map((value) => <span key={value} className="rounded-full px-3 py-1.5 text-xs text-muted ring-1 ring-line">{value}</span>)}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 pb-10 lg:grid-cols-2">
        <Panel>
          <div className="label-mono mb-3">Why choose EOZ</div>
          <ul className="space-y-2 text-sm text-muted">
            {WHY_CHOOSE_EOZ.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-emerald">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <div className="label-mono mb-3">EOZ vs. the advertiser</div>
          <p className="text-sm leading-6 text-muted">{ORG.recruitmentRole}</p>
          <p className="mt-3 text-sm leading-6 text-muted">{ORG.advertiserDistinction}</p>
        </Panel>
      </section>

      <section className="pb-10">
        <Panel>
          <div className="label-mono mb-3">Our distribution network</div>
          <p className="max-w-[65ch] text-sm text-muted">EOZ shares opportunities and career information through a strong WhatsApp presence alongside Facebook, LinkedIn and TikTok. Each channel can adapt the presentation, but verified employer facts and the official application route remain unchanged.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a href={org.social.whatsapp} target="_blank" rel="noreferrer" className="text-accent-soft hover:text-fg">WhatsApp channel</a>
            <a href={org.social.facebook} target="_blank" rel="noreferrer" className="text-accent-soft hover:text-fg">Facebook</a>
            <a href={org.social.linkedin} target="_blank" rel="noreferrer" className="text-accent-soft hover:text-fg">LinkedIn</a>
            <a href={org.social.tiktok} target="_blank" rel="noreferrer" className="text-accent-soft hover:text-fg">TikTok</a>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        {[
          { t: "Verify", d: "Every listing is checked against the original source before it is published." },
          { t: "Publish", d: "Category, region, deadline and application method are stated on every card." },
          { t: "Support", d: "Optional paid services help candidates and organisations present themselves well." },
        ].map((c) => (
          <Panel key={c.t}>
            <h2 className="font-display text-xl tracking-tight">{c.t}</h2>
            <p className="mt-2 text-sm text-muted">{c.d}</p>
          </Panel>
        ))}
      </section>

      <div className="pb-14">
        <Link to="/opportunities" className="text-sm text-accent-soft">
          Browse the opportunity board →
        </Link>
      </div>
    </SiteShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-line pt-2 first:border-0 first:pt-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
