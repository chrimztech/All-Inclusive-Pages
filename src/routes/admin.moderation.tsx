import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { MODERATION_QUEUE } from "@/lib/eoz-data";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation Queue — EOZ Staff Console" },
      {
        name: "description",
        content: "Review, approve or reject submitted opportunities before they reach the public board.",
      },
      { property: "og:title", content: "Moderation Queue — EOZ Staff Console" },
      {
        property: "og:description",
        content: "Verification workflow for submitted listings: draft, pending review, approved, rejected.",
      },
    ],
  }),
  component: Moderation,
});

const toneFor: Record<string, "amber" | "emerald" | "muted"> = {
  PENDING_REVIEW: "amber",
  APPROVED: "emerald",
  DRAFT: "muted",
};

function Moderation() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.1 ) — Moderation"
        title="Nothing publishes unverified."
        lead="Each submission must have a confirmed organisation, a working source link and an official application method."
      />
      <DashNav items={ADMIN_NAV} />

      <section className="space-y-3 pb-14">
        {MODERATION_QUEUE.map((m) => (
          <Panel key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Chip tone={toneFor[m.state] ?? "muted"}>{m.state}</Chip>
                  <span className="label-mono">Submitted {m.submitted}</span>
                </div>
                <h2 className="font-display text-xl tracking-tight">{m.title}</h2>
                <div className="mt-1 text-sm text-muted">
                  {m.organisation} · {m.flag}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="accent-gradient rounded-md px-3 py-1.5 text-xs font-medium text-ink">
                  Approve
                </button>
                <button className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg">
                  Request changes
                </button>
                <button className="rounded-md px-3 py-1.5 text-xs text-rose ring-1 ring-rose/30">
                  Reject
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </section>
    </SiteShell>
  );
}
