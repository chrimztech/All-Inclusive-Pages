import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { CATEGORIES, ORG, REGIONS } from "@/lib/eoz-data";

export const Route = createFileRoute("/employers/post")({
  head: () => ({
    meta: [
      { title: "Post an Opportunity — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Submit a job, internship, scholarship, grant, tender or training listing for verification and distribution by EOZ.",
      },
      { property: "og:title", content: "Post an Opportunity — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Submit a listing with your official application method for EOZ verification.",
      },
    ],
  }),
  component: PostOpportunity,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function PostOpportunity() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.2 ) — Submit"
        title="Post an opportunity."
        lead="Every submission is reviewed by EOZ staff. Listings without a valid official application method are rejected."
      />
      <DashNav items={EMPLOYER_NAV} />

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <label className="sm:col-span-2">
                <span className="label-mono">Opportunity title</span>
                <input className={inputCls} placeholder="e.g. Senior Data Analyst" />
              </label>
              <label>
                <span className="label-mono">Category</span>
                <select className={inputCls}>
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-mono">Region</span>
                <select className={inputCls}>
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-mono">Organisation</span>
                <input className={inputCls} />
              </label>
              <label>
                <span className="label-mono">Closing date</span>
                <input type="date" className={inputCls} />
              </label>
              <label className="sm:col-span-2">
                <span className="label-mono">Official application method (required)</span>
                <input className={inputCls} placeholder="Careers portal URL or employer email" />
              </label>
              <label className="sm:col-span-2">
                <span className="label-mono">Source link for verification</span>
                <input className={inputCls} placeholder="https://" />
              </label>
              <label className="sm:col-span-2">
                <span className="label-mono">Summary</span>
                <textarea rows={4} className={inputCls} />
              </label>
              <label className="sm:col-span-2">
                <span className="label-mono">Requirements (one per line)</span>
                <textarea rows={4} className={inputCls} />
              </label>
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <button className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink">
                  Submit for review
                </button>
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
                >
                  Save draft
                </button>
              </div>
            </form>
          </Panel>
        </div>
        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono mb-2">Review checklist</div>
            <ul className="space-y-2 text-sm text-muted">
              <li>— Organisation must be registered and reachable.</li>
              <li>— Source link must show the same role and deadline.</li>
              <li>— Application method must belong to the employer.</li>
              <li>— No application fees may be charged to candidates.</li>
            </ul>
          </Panel>
          <Panel>
            <p className="text-xs text-muted">{ORG.disclaimer}</p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
