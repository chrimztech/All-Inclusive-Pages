import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, CANDIDATE_NAV } from "@/components/eoz/DashNav";
import { REGIONS } from "@/lib/eoz-data";
import { api, ApiError, isUnauthenticated, type ApiCategory } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/50";

export const Route = createFileRoute("/candidate/alerts")({
  head: () => ({
    meta: [
      { title: "Opportunity Alerts — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Create email and SMS alerts for new verified Zambian jobs, scholarships, tenders and training that match your category and province.",
      },
      { property: "og:title", content: "Opportunity Alerts — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Set up alerts so matching opportunities reach you before the deadline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CandidateAlerts,
});

type Alert = { id: string; categoryName: string | null; keyword: string | null; region: string | null; frequency: string; active: boolean };

function CandidateAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const alertsQuery = useQuery({
    queryKey: ["candidate", "alerts"],
    queryFn: () => api.get<Alert[]>("/candidate/alerts"),
    retry: false,
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => api.get<ApiCategory[]>("/categories") });

  const [categoryCode, setCategoryCode] = useState("");
  const [region, setRegion] = useState("");
  const [keyword, setKeyword] = useState("");
  const [frequency, setFrequency] = useState("DAILY");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["candidate", "alerts"] });

  const create = useMutation({
    mutationFn: () => api.post("/candidate/alerts", { categoryCode: categoryCode || undefined, region: region || undefined, keyword: keyword || undefined, frequency }),
    onSuccess: () => {
      setKeyword("");
      invalidate();
      toast("Alert created.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not create the alert.", "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/candidate/alerts/${id}`),
    onSuccess: () => {
      invalidate();
      toast("Alert deleted.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not delete the alert.", "error"),
  });

  const alerts = alertsQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 04 ) — Candidate portal"
        title="Alerts"
        lead="Get told when something matching lands, so you are not refreshing the board."
      />
      <DashNav items={CANDIDATE_NAV} />

      {isUnauthenticated(alertsQuery.error) ? (
        <Panel className="mb-4">
          <p className="text-sm text-muted">Sign in as a candidate to manage your alerts.</p>
        </Panel>
      ) : null}

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {alerts.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">No alerts yet — create one to get notified of new matches.</p>
            </Panel>
          ) : null}
          {alerts.map((a) => (
            <Panel key={a.id} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-display text-lg tracking-tight">
                  {a.categoryName ?? "Any category"}
                  {a.region ? ` · ${a.region}` : ""}
                  {a.keyword ? ` · "${a.keyword}"` : ""}
                </div>
                <div className="mt-1 text-sm text-muted">{a.frequency}</div>
              </div>
              <div className="flex items-center gap-3">
                <Chip tone={a.active ? "emerald" : "muted"}>{a.active ? "Active" : "Paused"}</Chip>
                <button
                  onClick={() => remove.mutate(a.id)}
                  disabled={remove.isPending}
                  className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </Panel>
          ))}
        </div>

        <Panel>
          <div className="eyebrow mb-3">New alert</div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label className="block text-sm">
              <span className="label-mono">Category</span>
              <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className={field}>
                <option value="">Any category</option>
                {(categoriesQuery.data ?? []).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label-mono">Province</span>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={field}>
                <option value="">Any province</option>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label-mono">Keywords</span>
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className={field} placeholder="e.g. nursing, monitoring" />
            </label>
            <label className="block text-sm">
              <span className="label-mono">Frequency</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={field}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="INSTANT">Instant</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={create.isPending}
              className="accent-gradient w-full rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {create.isPending ? "Creating…" : "Create alert"}
            </button>
          </form>
        </Panel>
      </section>
    </SiteShell>
  );
}
