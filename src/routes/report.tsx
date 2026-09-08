import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { useOrgSettings } from "@/lib/use-org-settings";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

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
  const org = useOrgSettings();
  const { toast } = useToast();
  const [listingReference, setListingReference] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/fraud-reports", {
        listingReference: listingReference || undefined,
        reason,
        description: description || undefined,
        reporterName: reporterName || undefined,
        reporterEmail: reporterEmail || undefined,
      }),
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not submit this report.", "error"),
  });

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
              {org.phone}.
            </p>
          </Panel>
        }
      />

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          {mutation.isSuccess ? (
            <div className="py-6 text-sm">
              <p className="text-emerald-400">
                Report submitted. A moderator will re-check this listing shortly.
              </p>
              <p className="mt-2 text-muted">Reports can be anonymous — we never share your details with the organisation.</p>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="label-mono">Listing reference or link</span>
                  <input
                    className={field}
                    placeholder="EOZ-2026-0148"
                    value={listingReference}
                    onChange={(e) => setListingReference(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="label-mono">Reason</span>
                  <select className={field} value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="label-mono">What happened?</span>
                <textarea
                  rows={6}
                  className={field}
                  placeholder="Describe what you saw, including any numbers or accounts used."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="label-mono">Your name (optional)</span>
                  <input
                    className={field}
                    placeholder="Optional"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="label-mono">Email or phone (optional)</span>
                  <input
                    className={field}
                    placeholder="So we can follow up"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {mutation.isPending ? "Submitting…" : "Submit report"}
              </button>
              <p className="text-xs text-muted">Reports can be anonymous. We never share your details with the organisation.</p>
            </form>
          )}
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
