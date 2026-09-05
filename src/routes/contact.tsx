import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact EOZ — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Reach Echo Opportunities Zambia in Lusaka by phone or email for listings, services, partnerships or corrections.",
      },
      { property: "og:title", content: "Contact EOZ — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Phone, email and enquiry form for the Echo Opportunities Zambia team in Lusaka.",
      },
    ],
  }),
  component: Contact,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function Contact() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 09 ) — Contact"
        title="Talk to the EOZ team."
        lead="Listing corrections, service bookings, partnership enquiries and employer registration all start here."
      />

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
              <label>
                <span className="label-mono">Name</span>
                <input className={inputCls} />
              </label>
              <label>
                <span className="label-mono">Email</span>
                <input type="email" className={inputCls} />
              </label>
              <label>
                <span className="label-mono">Phone</span>
                <input className={inputCls} />
              </label>
              <label>
                <span className="label-mono">Reason</span>
                <select className={inputCls}>
                  <option>Listing correction</option>
                  <option>Employer registration</option>
                  <option>Professional services</option>
                  <option>Partnership</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="label-mono">Message</span>
                <textarea rows={5} className={inputCls} />
              </label>
              <button className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink sm:col-span-2 sm:justify-self-start">
                Send enquiry
              </button>
            </form>
          </Panel>
        </div>
        <aside className="space-y-4 lg:col-span-5">
          <Panel>
            <div className="label-mono mb-3">Direct</div>
            <p className="text-sm">
              <a href={`tel:${ORG.phone.replace(/\s/g, "")}`} className="hover:text-accent-soft">
                {ORG.phone}
              </a>
            </p>
            <p className="mt-1 text-sm">
              <a href={`mailto:${ORG.email}`} className="hover:text-accent-soft">
                {ORG.email}
              </a>
            </p>
            <p className="mt-3 text-sm text-muted">{ORG.location}</p>
          </Panel>
          <Panel>
            <div className="label-mono mb-2">Please note</div>
            <p className="text-xs text-muted">{ORG.disclaimer}</p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
