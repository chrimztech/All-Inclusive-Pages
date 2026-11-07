import { Fragment, useRef, useState, type ReactNode } from "react";
import { Heading2, Plus, X } from "lucide-react";
import { MAX_EMAILS, newEmailRow, type EmailKind, type EmailRow } from "@/lib/email-list";

/* -------------------------------------------------------------------------------------------------------------------
 * Opportunity details: free text that keeps the poster's own line breaks and spacing. A line starting with "# " or
 * "## " is a heading and **text** is bold; nothing else is changed (no automatic bullets or numbering).
 * ---------------------------------------------------------------------------------------------------------------- */

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-fg">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Renders opportunity details exactly as typed, with headings and bold. */
export function FormattedText({ text, className = "" }: { text: string; className?: string }) {
  const blocks: { heading: boolean; text: string }[] = [];
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ heading: true, text: heading[1] ?? "" });
    } else {
      const last = blocks[blocks.length - 1];
      if (last && !last.heading) last.text += "\n" + line;
      else blocks.push({ heading: false, text: line });
    }
  }
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.heading ? (
          <h3 key={i} className="mt-6 mb-2 font-display text-xl tracking-tight text-fg first:mt-0">
            {inline(b.text)}
          </h3>
        ) : b.text.trim() ? (
          <p key={i} className="whitespace-pre-wrap break-words">
            {inline(b.text.replace(/^\n+|\n+$/g, ""))}
          </p>
        ) : null,
      )}
    </div>
  );
}

const editorCls =
  "w-full rounded-md bg-surface-2 px-3 py-2 font-[inherit] text-sm leading-6 outline-none ring-1 ring-line focus:ring-accent/40";

/** Free-form editor for opportunity details, with a heading shortcut and a preview of the published result. */
export function DetailsEditor({
  value,
  onChange,
  label = "Opportunity details",
  rows = 12,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  rows?: number;
}) {
  const [preview, setPreview] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const insert = (prefix: string, suffix = "") => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = suffix
      ? value.slice(0, start) + prefix + value.slice(start, end) + suffix + value.slice(end)
      : value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = suffix ? end + prefix.length : start + prefix.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const tab = (on: boolean) =>
    `rounded px-2.5 py-1 text-xs transition-colors ${on ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg"}`;

  return (
    <div className="block">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="label-mono">{label}</span>
        <div className="flex items-center gap-1">
          {!preview ? (
            <>
              <button
                type="button"
                onClick={() => insert("## ")}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
                title="Make the current line a heading"
              >
                <Heading2 aria-hidden="true" className="size-3.5" />
                Heading
              </button>
              <button
                type="button"
                onClick={() => insert("**", "**")}
                className="rounded px-2 py-1 text-xs font-bold text-muted ring-1 ring-line hover:text-fg"
                title="Bold the selected text"
              >
                B
              </button>
            </>
          ) : null}
          <span className="ml-1 inline-flex rounded-md p-0.5 ring-1 ring-line">
            <button type="button" className={tab(!preview)} onClick={() => setPreview(false)}>
              Write
            </button>
            <button type="button" className={tab(preview)} onClick={() => setPreview(true)}>
              Preview
            </button>
          </span>
        </div>
      </div>
      {preview ? (
        <div className="min-h-40 rounded-md bg-surface-2 px-4 py-3 text-sm leading-6 text-muted ring-1 ring-line">
          {value.trim() ? (
            <FormattedText text={value} className="space-y-3" />
          ) : (
            <span className="text-muted/70">Nothing to preview yet.</span>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          aria-label={label}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            "Write everything applicants need: positions, requirements, documents to submit, instructions…\n\nLine breaks and spacing are kept exactly as typed. Start a line with ## for a heading."
          }
          className={editorCls}
        />
      )}
      <p className="mt-1 text-[11px] text-muted">
        Shown exactly as typed. Use the Heading button (or start a line with ##) for section titles.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------------------------
 * Application email addresses: one or more "To" addresses plus optional CC and BCC.
 * ---------------------------------------------------------------------------------------------------------------- */

const KIND_LABELS: Record<EmailKind, string> = { to: "To", cc: "CC", bcc: "BCC" };

export function EmailListEditor({
  rows,
  onChange,
  inputClassName,
}: {
  rows: EmailRow[];
  onChange: (rows: EmailRow[]) => void;
  inputClassName: string;
}) {
  const update = (id: number, patch: Partial<EmailRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const firstTo = rows.find((r) => r.kind === "to")?.id;

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-center gap-2">
          <select
            aria-label={`Email ${i + 1} type`}
            value={r.kind}
            disabled={r.id === firstTo}
            onChange={(e) => update(r.id, { kind: e.target.value as EmailKind })}
            className={`${inputClassName} !mt-0 !w-24 shrink-0`}
          >
            {(Object.keys(KIND_LABELS) as EmailKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            type="email"
            required={r.id === firstTo}
            aria-label={r.id === firstTo ? "Email address for applications" : `Email ${i + 1}`}
            placeholder={r.id === firstTo ? "careers@employer.zm" : "another@employer.zm"}
            value={r.address}
            onChange={(e) => update(r.id, { address: e.target.value })}
            className={`${inputClassName} !mt-0 min-w-0 flex-1`}
          />
          {r.id !== firstTo ? (
            <button
              type="button"
              aria-label={`Remove ${r.address || "this email"}`}
              onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
              className="shrink-0 rounded-md p-2 text-muted ring-1 ring-line hover:text-rose"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : (
            <span className="w-[34px] shrink-0" />
          )}
        </div>
      ))}
      {rows.length < MAX_EMAILS ? (
        <button
          type="button"
          onClick={() => onChange([...rows, newEmailRow("to")])}
          className="inline-flex items-center gap-1 text-xs text-accent-soft hover:text-fg"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Add another email
        </button>
      ) : null}
      <p className="text-[11px] text-muted">
        Applicants send to every “To” address and copy in any CC or BCC addresses.
      </p>
    </div>
  );
}
