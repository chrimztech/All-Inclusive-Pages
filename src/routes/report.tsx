import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";

const REASONS = [
  "Suspected scam or fraud",
  "Asks applicants for payment",
  "Listing has expired",
  "Wrong or missing application details",
  "Duplicate listing",
  "Other",
];

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/50";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a Listing — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Report a suspicious, expired or inaccurate opportunity on Echo Opportunities Zambia. Our staff re-check the source and take the listing down while reviewing.",
      },
      { property: "og:title", content: "Report a Listing — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Tell the EOZ team about a listing that looks wrong and we will re-check it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 12 ) — Report"
        title="Tell us about a listing that looks wrong."
        lead="Reports go straight to the moderation queue. We suspend the listing while we re-check it against the original source."
        aside={
          <Panel>
            <Chip tone="rose">Urgent</Chip>
            <p className="mt-3 text-sm text-muted">
              If money has already changed hands, contact the Zambia Police in addition to reporting here. Reach us on{" "}
              {ORG.phone}.
            </p>
          </Panel>
        }
      />

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="label-mono">Listing reference or link</span>
                <input className={field} placeholder="EOZ-2026-0148" />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Reason</span>
                <select className={field} defaultValue={REASONS[0]}>
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="label-mono">What happened?</span>
              <textarea rows={6} className={field} placeholder="Describe what you saw, including any numbers or accounts used." />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="label-mono">Your name (optional)</span>
                <input className={field} placeholder="Optional" />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Email or phone (optional)</span>
                <input className={field} placeholder="So we can follow up" />
              </label>
            </div>
            <button type="submit" className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink">
              Submit report
            </button>
            <p className="text-xs text-muted">Reports can be anonymous. We never share your details with the organisation.</p>
          </form>
        </Panel>

        <Panel>
          <div className="eyebrow mb-3">What happens next</div>
          <ol className="space-y-4 text-sm text-muted">
            <li>
              <span className="font-mono text-xs text-amber">01</span> — A moderator receives the report immediately.
            </li>
            <li>
              <span className="font-mono text-xs text-amber">02</span> — The listing is hidden while the source is re-checked.
            </li>
            <li>
              <span className="font-mono text-xs text-amber">03</span> — It is restored, corrected or removed, and the
              organisation is flagged where needed.
            </li>
          </ol>
        </Panel>
      </section>
    </SiteShell>
  );
}
