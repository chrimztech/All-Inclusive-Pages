import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { CATEGORIES, REGIONS } from "@/lib/eoz-data";

export const Route = createFileRoute("/candidate/profile")({
  head: () => ({
    meta: [
      { title: "Candidate Profile — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Set your field, region and interests so EOZ matches you with the most relevant Zambian opportunities.",
      },
      { property: "og:title", content: "Candidate Profile — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Manage your matching preferences, skills and documents in the EOZ candidate portal.",
      },
    ],
  }),
  component: Profile,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="label-mono">{label}</span>
      <input
        defaultValue={value}
        className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
      />
    </label>
  );
}

function Profile() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.3 ) — Profile"
        title="Tell us what you're looking for."
        lead="Matching uses your field, region and opportunity type. Nothing here is shared with employers."
      />
      <DashNav items={CANDIDATE_NAV} />

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value="Chanda Mwansa" />
              <Field label="Email" value="chanda@example.zm" />
              <Field label="Phone" value="0977 000 000" />
              <Field label="Highest qualification" value="BSc Computer Science" />
              <label className="block">
                <span className="label-mono">Region</span>
                <select className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line">
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-mono">Years of experience</span>
                <select className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line">
                  <option>0-1</option>
                  <option>2-4</option>
                  <option>5-9</option>
                  <option>10+</option>
                </select>
              </label>
            </div>

            <div className="mt-6">
              <div className="label-mono mb-2">Interested in</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <label key={c} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 ring-line">
                    <input type="checkbox" defaultChecked className="size-3" />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <button className="accent-gradient mt-6 rounded-md px-4 py-2 text-sm font-medium text-ink">
              Save preferences
            </button>
          </Panel>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono mb-3">Documents</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span>CV_Chanda_2026.pdf</span>
                <Chip tone="emerald">Ready</Chip>
              </li>
              <li className="flex items-center justify-between">
                <span>Cover letter template</span>
                <Chip tone="muted">Draft</Chip>
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              Documents are stored for your own use. EOZ never forwards them to employers.
            </p>
          </Panel>
          <Panel>
            <div className="label-mono mb-2">Profile strength</div>
            <div className="h-1.5 rounded-full bg-line">
              <div className="accent-gradient h-1.5 w-3/4 rounded-full" />
            </div>
            <p className="mt-2 text-xs text-muted">75% — add two skills to improve matching.</p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
