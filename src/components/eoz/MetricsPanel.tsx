import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Info } from "lucide-react";
import { Panel } from "@/components/eoz/SiteShell";
import { API_BASE_URL, api, ApiError } from "@/lib/api-client";

type Metric = {
  key: string;
  label: string;
  value: number | null;
  unit: "count" | "percent" | "hours" | "days" | "ratio" | "rating" | "ZMW";
  definition: string;
};
type Family = {
  key: string;
  label: string;
  metrics: Metric[];
  breakdowns: { label: string; items: { name: string; count: number }[] }[];
};
type Report = { from: string; to: string; timeZone: string; families: Family[] };

/** Today's date in Lusaka as YYYY-MM-DD, shifted by `days`. */
function lusakaDate(days = 0) {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lusaka" }).format(d);
}

const nf = new Intl.NumberFormat("en-ZM");

function format(m: Metric) {
  if (m.value == null) return "—";
  switch (m.unit) {
    case "percent":
      return `${m.value.toFixed(1)}%`;
    case "hours":
      return m.value < 48 ? `${m.value.toFixed(1)} h` : `${(m.value / 24).toFixed(1)} d`;
    case "days":
      return `${m.value.toFixed(1)} d`;
    case "rating":
      return `${m.value.toFixed(1)} / 5`;
    case "ZMW":
      return `K ${nf.format(m.value)}`;
    case "ratio":
      return m.value.toFixed(1);
    default:
      return nf.format(m.value);
  }
}

const inputCls =
  "rounded-md bg-surface-2 px-2 py-1.5 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/50";

/** Defined platform metrics for a date range, each with its definition on demand (spec §12). */
export function MetricsPanel() {
  const [from, setFrom] = useState(() => lusakaDate(-29));
  const [to, setTo] = useState(() => lusakaDate());
  const query = useQuery({
    queryKey: ["admin", "reports", "metrics", from, to],
    queryFn: () => api.get<Report>("/admin/reports/metrics", { from, to }),
    retry: false,
  });
  const preset = (days: number) => {
    setFrom(lusakaDate(-(days - 1)));
    setTo(lusakaDate());
  };

  return (
    <section aria-labelledby="metrics-heading" className="pb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="metrics-heading" className="font-display text-2xl">
            Defined metrics
          </h2>
          <p className="mt-1 text-xs text-muted">
            Whole days in Africa/Lusaka time. Select{" "}
            <Info aria-hidden="true" className="inline size-3" /> on any figure for exactly how it
            is counted.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div role="group" aria-label="Quick ranges" className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => preset(d)}
                className="rounded-md px-2.5 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg"
              >
                {d} days
              </button>
            ))}
          </div>
          <label className="text-xs text-muted">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => e.target.value && setFrom(e.target.value)}
              className={`${inputCls} ml-1`}
            />
          </label>
          <label className="text-xs text-muted">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => e.target.value && setTo(e.target.value)}
              className={`${inputCls} ml-1`}
            />
          </label>
          <a
            href={`${API_BASE_URL}/admin/reports/metrics.csv?from=${from}&to=${to}`}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            <Download aria-hidden="true" className="size-3.5" />
            CSV
          </a>
        </div>
      </div>

      {query.isError ? (
        <Panel>
          <p role="alert" className="text-sm text-rose">
            {query.error instanceof ApiError ? query.error.message : "Could not load metrics."}
          </p>
        </Panel>
      ) : null}
      {query.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {(query.data?.families ?? []).map((family) => (
          <Panel key={family.key} className="p-5">
            <h3 className="label-mono mb-3">{family.label}</h3>
            <dl className="divide-y divide-line">
              {family.metrics.map((m) => (
                <div key={m.key} className="py-2">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 [&::-webkit-details-marker]:hidden">
                      <dt className="flex items-center gap-1.5 text-sm text-muted group-open:text-fg">
                        {m.label}
                        <Info aria-hidden="true" className="size-3 opacity-60" />
                        <span className="sr-only">(show definition)</span>
                      </dt>
                      <dd className="font-mono text-sm tabular-nums">{format(m)}</dd>
                    </summary>
                    <p className="mt-1.5 rounded-md bg-white/[0.03] p-2 text-xs leading-5 text-muted ring-1 ring-line">
                      {m.definition}
                    </p>
                  </details>
                </div>
              ))}
            </dl>
            {family.breakdowns
              .filter((b) => b.items.length > 0)
              .map((b) => {
                const max = Math.max(...b.items.map((i) => i.count), 1);
                return (
                  <div key={b.label} className="mt-4">
                    <div className="mb-2 text-xs text-muted">{b.label}</div>
                    <ul className="space-y-1.5">
                      {b.items.map((item) => (
                        <li
                          key={item.name}
                          className="grid grid-cols-[8rem_1fr_auto] items-center gap-2 text-xs"
                        >
                          <span className="truncate" title={item.name}>
                            {item.name.replaceAll("_", " ").toLowerCase()}
                          </span>
                          <span className="h-1.5 rounded-full bg-line">
                            <span
                              className="accent-gradient block h-1.5 rounded-full"
                              style={{ width: `${(item.count / max) * 100}%` }}
                            />
                          </span>
                          <span className="font-mono tabular-nums">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </Panel>
        ))}
      </div>
    </section>
  );
}
