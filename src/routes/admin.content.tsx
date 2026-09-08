import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/content")({ head: () => ({ meta: [{ title: "Content Calendar — EOZ Staff" }] }), component: Content });

type ContentVariant = { id: string; channel: string; body: string; updatedAt: string };
type ContentItem = {
  id: string;
  title: string;
  series: string | null;
  body: string;
  opportunityId: string | null;
  status: string;
  versionHash: string;
  variants: ContentVariant[];
};
type OpportunityOption = { id: string; reference: string; title: string };

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

const statusTone: Record<string, "emerald" | "amber" | "muted"> = {
  PUBLISHED: "emerald",
  SCHEDULED: "emerald",
  APPROVED: "amber",
  PENDING_REVIEW: "amber",
  DRAFT: "muted",
};

function Content() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const itemsQuery = useQuery({
    queryKey: ["admin", "content"],
    queryFn: () => api.get<PageResponse<ContentItem>>("/admin/content", { size: 50 }),
    retry: false,
  });

  const [title, setTitle] = useState("");
  const [series, setSeries] = useState("GENERAL");
  const [body, setBody] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [opportunityLabel, setOpportunityLabel] = useState("");
  const [opportunitySearch, setOpportunitySearch] = useState("");

  const opportunityOptionsQuery = useQuery({
    queryKey: ["admin", "content-opportunity-options", opportunitySearch],
    queryFn: () => api.get<PageResponse<OpportunityOption>>("/opportunities/admin/all", { q: opportunitySearch, size: 10 }),
    enabled: opportunitySearch.length > 1,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "content"] });

  function errorMessage(error: unknown, fallback: string) {
    return error instanceof ApiError ? error.message : fallback;
  }

  const create = useMutation({
    mutationFn: () =>
      api.post("/admin/content", {
        title,
        series,
        body,
        opportunityId: opportunityId.trim() || undefined,
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setOpportunityId("");
      setOpportunityLabel("");
      invalidate();
      toast("Content item created.");
    },
    onError: (error) => toast(errorMessage(error, "Could not create content item."), "error"),
  });

  const submit = useMutation({
    mutationFn: (id: string) => api.post(`/admin/content/${id}/submit`),
    onSuccess: () => {
      invalidate();
      toast("Submitted for review.");
    },
    onError: (error) => toast(errorMessage(error, "Could not submit content."), "error"),
  });
  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/content/${id}/approve`),
    onSuccess: () => {
      invalidate();
      toast("Content approved.");
    },
    onError: (error) => toast(errorMessage(error, "Could not approve content."), "error"),
  });
  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/admin/content/${id}/publish`),
    onSuccess: () => {
      invalidate();
      toast("Content published.");
    },
    onError: (error) => toast(errorMessage(error, "Could not publish content."), "error"),
  });
  const generate = useMutation({
    mutationFn: ({ id, channel }: { id: string; channel: string }) =>
      api.post(`/admin/content/${id}/variants/generate?channel=${channel}`),
    onSuccess: () => {
      invalidate();
      toast("Variant generated.");
    },
    onError: (error) => toast(errorMessage(error, "Could not generate variant."), "error"),
  });

  const items = itemsQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.9 ) — Content"
        title="One verified fact set, many channels."
        lead="Create channel variants from canonical opportunities without changing deadlines, eligibility, location or official application routes."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(itemsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a content, manager or admin account to manage content.</p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel>
            <div className="label-mono mb-3">New content item</div>
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <label>
                <span className="label-mono">Title</span>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </label>
              <label>
                <span className="label-mono">Series</span>
                <select value={series} onChange={(e) => setSeries(e.target.value)} className={inputCls}>
                  <option value="GENERAL">General</option>
                  <option value="MORNING_DEVOTION">Morning devotion</option>
                  <option value="AFTERNOON_CAREER">Afternoon career/HR</option>
                  <option value="EVENING_DEVOTION">Evening devotion</option>
                </select>
              </label>
              <label>
                <span className="label-mono">Body</span>
                <textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} />
              </label>
              <label className="relative">
                <span className="label-mono">Linked opportunity (optional, enables variant generation)</span>
                {opportunityId ? (
                  <div className="mt-1 flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm ring-1 ring-accent/30">
                    <span className="truncate">{opportunityLabel}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOpportunityId("");
                        setOpportunityLabel("");
                        setOpportunitySearch("");
                      }}
                      className="ml-2 shrink-0 text-xs text-muted hover:text-fg"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={opportunitySearch}
                      onChange={(e) => setOpportunitySearch(e.target.value)}
                      placeholder="Search opportunities by title or reference"
                      className={inputCls}
                    />
                    {opportunitySearch.length > 1 ? (
                      <div className="absolute z-10 mt-1 w-full rounded-md bg-surface-2 py-1 text-sm ring-1 ring-line">
                        {opportunityOptionsQuery.isLoading ? (
                          <div className="px-3 py-2 text-xs text-muted">Searching…</div>
                        ) : null}
                        {(opportunityOptionsQuery.data?.items ?? []).map((o) => (
                          <button
                            type="button"
                            key={o.id}
                            onClick={() => {
                              setOpportunityId(o.id);
                              setOpportunityLabel(`${o.title} (${o.reference})`);
                              setOpportunitySearch("");
                            }}
                            className="block w-full px-3 py-2 text-left hover:bg-ink"
                          >
                            {o.title} <span className="text-xs text-muted">({o.reference})</span>
                          </button>
                        ))}
                        {opportunityOptionsQuery.isSuccess && (opportunityOptionsQuery.data?.items ?? []).length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted">No matches.</div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </label>
              <button
                disabled={create.isPending}
                className="accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {create.isPending ? "Creating…" : "Create content item"}
              </button>
            </form>
          </Panel>
        </div>

        <div className="space-y-3 lg:col-span-7">
          {items.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">No content items yet.</p>
            </Panel>
          ) : null}
          {items.map((item) => (
            <Panel key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Chip tone={statusTone[item.status] ?? "muted"}>{item.status}</Chip>
                    <span className="font-mono text-xs text-muted">{item.versionHash}</span>
                  </div>
                  <div className="text-sm">{item.title}</div>
                  <div className="text-xs text-muted">{item.series ?? "General"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.status === "DRAFT" ? (
                    <button onClick={() => submit.mutate(item.id)} className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg">
                      Submit
                    </button>
                  ) : null}
                  {item.status === "PENDING_REVIEW" ? (
                    <button onClick={() => approve.mutate(item.id)} className="rounded-md px-3 py-1 text-xs text-emerald ring-1 ring-emerald/30">
                      Approve
                    </button>
                  ) : null}
                  {(item.status === "APPROVED" || item.status === "SCHEDULED") ? (
                    <button onClick={() => publish.mutate(item.id)} className="accent-gradient rounded-md px-3 py-1 text-xs font-medium text-ink">
                      Publish
                    </button>
                  ) : null}
                </div>
              </div>
              {item.opportunityId ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {["WHATSAPP", "FACEBOOK", "LINKEDIN", "TIKTOK"].map((channel) => (
                    <button
                      key={channel}
                      onClick={() => generate.mutate({ id: item.id, channel })}
                      className="rounded-md px-3 py-1 text-xs text-accent-soft ring-1 ring-line hover:text-fg"
                    >
                      Generate {channel}
                    </button>
                  ))}
                </div>
              ) : null}
              {item.variants.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  {item.variants.map((v) => (
                    <div key={v.id} className="rounded-md bg-surface-2 p-2 text-xs">
                      <div className="label-mono mb-1">{v.channel}</div>
                      <pre className="whitespace-pre-wrap font-sans text-muted">{v.body}</pre>
                    </div>
                  ))}
                </div>
              ) : null}
            </Panel>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
