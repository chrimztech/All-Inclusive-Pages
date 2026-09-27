import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardCheck, Trash2 } from "lucide-react";
import { Panel } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export type ScorecardCriterion = {
  id: string;
  name: string;
  guidance: string | null;
  weight: number;
  position: number;
};

export const scorecardKey = (projectId: string) => ["admin", "recruitment", projectId, "scorecard"];

export function useScorecard(projectId: string) {
  return useQuery({
    queryKey: scorecardKey(projectId),
    queryFn: () => api.get<ScorecardCriterion[]>(`/recruitment/projects/${projectId}/scorecard`),
  });
}

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50";

const WEIGHT_LABEL: Record<number, string> = { 1: "Normal", 2: "Important", 3: "Critical" };

/** Criteria every interviewer scores for this project, so feedback is comparable across the panel. */
export function ScorecardEditor({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scorecard = useScorecard(projectId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [guidance, setGuidance] = useState("");
  const [weight, setWeight] = useState(1);
  const fail = (e: unknown, fallback: string) =>
    toast(e instanceof ApiError ? e.message : fallback, "error");
  const refresh = () => queryClient.invalidateQueries({ queryKey: scorecardKey(projectId) });

  const add = useMutation({
    mutationFn: () =>
      api.post(`/recruitment/projects/${projectId}/scorecard`, {
        name,
        guidance: guidance || undefined,
        weight,
      }),
    onSuccess: () => {
      setName("");
      setGuidance("");
      setWeight(1);
      refresh();
      toast("Criterion added.");
    },
    onError: (e) => fail(e, "Could not add the criterion."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/recruitment/projects/${projectId}/scorecard/${id}`),
    onSuccess: () => {
      refresh();
      toast("Criterion removed.");
    },
    onError: (e) => fail(e, "Could not remove the criterion."),
  });

  const criteria = scorecard.data ?? [];

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck aria-hidden="true" className="size-4 text-accent-soft" />
          <span className="label-mono">Interview scorecard ({criteria.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg"
        >
          {adding ? "Close" : "Add criterion"}
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">
        Interviewers score each criterion from 1 to 5; the weighted average appears with their
        feedback. Score job-related skills and behaviours only — never age, gender, tribe, religion,
        disability or other protected characteristics.
      </p>

      {scorecard.isLoading ? <div className="skeleton mt-3 h-16 rounded-xl" /> : null}
      {scorecard.isSuccess && criteria.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No criteria yet — interviewers give a single overall rating.
        </p>
      ) : null}
      {criteria.length > 0 ? (
        <ol className="mt-3 divide-y divide-line">
          {criteria.map((c, i) => (
            <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0 text-sm">
                <span className="mr-2 font-mono text-xs text-muted">{i + 1}.</span>
                {c.name}
                <span className="ml-2 rounded bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-line">
                  {WEIGHT_LABEL[c.weight] ?? `×${c.weight}`}
                </span>
                {c.guidance ? <p className="mt-0.5 pl-5 text-xs text-muted">{c.guidance}</p> : null}
              </div>
              <button
                type="button"
                aria-label={`Remove ${c.name}`}
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Remove "${c.name}" from the scorecard?`)) remove.mutate(c.id);
                }}
                className="shrink-0 rounded-md p-1.5 text-muted ring-1 ring-line hover:text-rose disabled:opacity-60"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      {adding ? (
        <form
          className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <label className="sm:col-span-3">
            <span className="label-mono">Criterion</span>
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data analysis (SQL, Excel)"
              className={field}
            />
          </label>
          <label className="sm:col-span-3">
            <span className="label-mono">Weight</span>
            <select
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className={field}
            >
              {[1, 2, 3].map((w) => (
                <option key={w} value={w}>
                  {WEIGHT_LABEL[w]} (×{w})
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-6">
            <span className="label-mono">What good looks like (optional)</span>
            <input
              maxLength={500}
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="e.g. Writes a correct join and explains the result"
              className={field}
            />
          </label>
          <button
            type="submit"
            disabled={add.isPending}
            className="accent-gradient justify-self-start rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 sm:col-span-6"
          >
            {add.isPending ? "Adding…" : "Add to scorecard"}
          </button>
        </form>
      ) : null}
    </Panel>
  );
}
