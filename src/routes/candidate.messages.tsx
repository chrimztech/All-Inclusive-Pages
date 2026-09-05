import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/candidate/messages")({
  head: () => ({
    meta: [
      { title: "Messages - EOZ Candidate Portal" },
      {
        name: "description",
        content: "Secure messages about EOZ-hosted services and authorised recruitment activity.",
      },
    ],
  }),
  component: CandidateMessages,
});

const THREADS = [
  {
    id: "cv",
    title: "ATS-friendly CV writing",
    ref: "EOZ-SVC-2026-000044",
    preview: "Your consultation notes are confirmed.",
    unread: 1,
  },
  {
    id: "interview",
    title: "Interview coaching",
    ref: "EOZ-SVC-2026-000031",
    preview: "Your feedback pack is ready.",
    unread: 0,
  },
  {
    id: "support",
    title: "EOZ support",
    ref: "SUP-2026-00182",
    preview: "We updated your alert preferences.",
    unread: 0,
  },
];

function CandidateMessages() {
  const [selected, setSelected] = useState(THREADS[0]!);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04.8 ) - Messages"
        title="Private conversations, tied to the work."
        lead="Use secure messages for EOZ service orders, support and authorised EOZ-hosted recruitment only. Apply to third-party vacancies through the employer route."
      />
      <DashNav items={CANDIDATE_NAV} />
      <section className="grid gap-4 pb-14 lg:grid-cols-12">
        <Panel className="lg:col-span-4">
          <div className="label-mono mb-3">Conversations</div>
          <div className="space-y-2">
            {THREADS.map((thread) => (
              <button
                type="button"
                key={thread.id}
                onClick={() => {
                  setSelected(thread);
                  setSent(false);
                }}
                className={`w-full rounded-lg p-3 text-left ring-1 transition-colors ${selected.id === thread.id ? "bg-accent/10 ring-accent/35" : "ring-line hover:bg-surface-2"}`}
              >
                <div className="flex justify-between gap-2">
                  <span className="text-sm">{thread.title}</span>
                  {thread.unread ? <Chip tone="amber">{thread.unread} new</Chip> : null}
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted">{thread.ref}</div>
                <p className="mt-2 truncate text-xs text-muted">{thread.preview}</p>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="flex min-h-[480px] flex-col lg:col-span-8">
          <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="font-display text-2xl">{selected.title}</h2>
              <div className="font-mono text-[10px] text-muted">{selected.ref}</div>
            </div>
            <ShieldCheck aria-label="Private conversation" className="size-5 text-accent-soft" />
          </div>
          <div className="flex-1 space-y-4 py-5">
            <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-surface-2 p-3 text-sm">
              <p>{selected.preview}</p>
              <span className="mt-2 block text-[10px] text-muted">EOZ team · Yesterday, 15:20</span>
            </div>
            <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-accent/15 p-3 text-sm">
              <p>Thank you. I have reviewed the update and everything is correct.</p>
              <span className="mt-2 block text-[10px] text-muted">You · Yesterday, 16:04</span>
            </div>
            {sent ? (
              <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-accent/15 p-3 text-sm">
                <p>Message sent securely.</p>
                <span className="mt-2 block text-[10px] text-muted">You · Just now</span>
              </div>
            ) : null}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) {
                setSent(true);
                setDraft("");
              }
            }}
            className="flex gap-2 border-t border-line pt-4"
          >
            <label className="sr-only" htmlFor="message">
              Write a message
            </label>
            <textarea
              id="message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              placeholder="Write a secure message"
              className="min-h-11 flex-1 resize-none rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="accent-gradient grid size-11 place-items-center self-end rounded-md text-ink"
            >
              <Send aria-hidden="true" className="size-4" />
            </button>
          </form>
        </Panel>
      </section>
    </SiteShell>
  );
}
