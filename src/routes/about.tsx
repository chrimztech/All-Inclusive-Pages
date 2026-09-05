import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About EOZ — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Echo Opportunities Zambia curates and distributes verified jobs, scholarships, grants, tenders and training across Zambia from Lusaka.",
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
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 08 ) — About"
        title={<>Connecting talent.<br />Creating opportunities.</>}
        lead={`${ORG.name} is a Lusaka-based opportunity distribution platform. We find, verify and publish opportunities so that Zambians hear about them in time to act.`}
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
              <Row k="Name" v={ORG.name} />
              <Row k="Short name" v={ORG.short} />
              <Row k="Location" v={ORG.location} />
              <Row k="Phone" v={ORG.phone} />
              <Row k="Email" v={ORG.email} />
            </dl>
          </Panel>
          <Panel>
            <div className="label-mono mb-2">Our promise</div>
            <p className="text-xs text-muted">{ORG.disclaimer}</p>
          </Panel>
        </aside>
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
