import { useState, type ReactNode } from "react";
import { Chip, Panel } from "@/components/eoz/SiteShell";

export type RecordTone = "accent" | "emerald" | "amber" | "rose" | "muted";

export type WorkspaceRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  tone?: RecordTone;
  details: string[];
  action?: string;
};

export function WorkspaceList({
  records,
  searchLabel = "Search records",
  empty = "No records match your search.",
}: {
  records: WorkspaceRecord[];
  searchLabel?: string;
  empty?: string;
}) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const filtered = records.filter((record) =>
    `${record.title} ${record.subtitle} ${record.status} ${record.details.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div>
      <label className="mb-4 block">
        <span className="sr-only">{searchLabel}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchLabel}
          className="w-full rounded-md bg-surface-2 px-3 py-2.5 text-sm outline-none ring-1 ring-line placeholder:text-muted focus:ring-accent/50"
        />
      </label>
      {message ? (
        <div
          role="status"
          className="mb-4 rounded-md bg-accent/10 px-3 py-2 text-xs text-accent-soft ring-1 ring-accent/25"
        >
          {message}
        </div>
      ) : null}
      <div className="space-y-3">
        {filtered.map((record) => (
          <Panel key={record.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip tone={record.tone ?? "muted"}>{record.status}</Chip>
                  <span className="font-mono text-[10px] text-muted">{record.id}</span>
                </div>
                <h2 className="font-display text-xl tracking-tight">{record.title}</h2>
                <p className="mt-1 text-sm text-muted">{record.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                  {record.details.map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                </div>
              </div>
              {record.action ? (
                <button
                  type="button"
                  onClick={() => setMessage(`${record.action}: ${record.title}`)}
                  className="rounded-md px-3 py-2 text-xs text-fg ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-accent-soft"
                >
                  {record.action}
                </button>
              ) : null}
            </div>
          </Panel>
        ))}
        {!filtered.length ? (
          <Panel className="py-10 text-center text-sm text-muted">{empty}</Panel>
        ) : null}
      </div>
    </div>
  );
}

export function ProgressLine({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className="accent-gradient h-full rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function SettingToggle({
  title,
  description,
  initial = true,
  locked = false,
}: {
  title: string;
  description: string;
  initial?: boolean;
  locked?: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={locked}
      onClick={() => setEnabled((value) => !value)}
      className="flex w-full items-start justify-between gap-4 border-t border-line py-4 text-left first:border-0 first:pt-0 last:pb-0 disabled:cursor-not-allowed"
    >
      <span>
        <span className="block text-sm text-fg">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
      </span>
      <span
        className={`mt-0.5 rounded-full px-2.5 py-1 font-mono text-[10px] ring-1 ${enabled ? "bg-accent/10 text-accent-soft ring-accent/30" : "bg-line text-muted ring-line"}`}
      >
        {locked ? "REQUIRED" : enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}

export function SummaryPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Panel>
      <div className="label-mono mb-4">{label}</div>
      {children}
    </Panel>
  );
}
