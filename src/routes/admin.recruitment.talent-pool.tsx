import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/recruitment/talent-pool")({
  head: () => ({ meta: [{ title: "Talent Pool — EOZ Staff Console" }] }),
  component: TalentPool,
});

type TalentPoolCandidate = {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  stage: string;
  projectTitle: string;
  tags: string[];
};

function TalentPool() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});

  const poolQuery = useQuery({
    queryKey: ["admin", "talent-pool", query, tag],
    queryFn: () => api.get<TalentPoolCandidate[]>("/recruitment/talent-pool", { q: query || undefined, tag: tag || undefined }),
    retry: false,
  });

  const addTag = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => api.post(`/recruitment/candidates/${id}/tags`, { tag: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "talent-pool"] });
      toast("Tag added.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not add tag.", "error"),
  });

  const results = poolQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.7 ) — Talent pool"
        title="Search across every pipeline."
        lead="Find candidates by name, email or tag across all recruitment projects, active or closed."
      />
      <DashNav items={ADMIN_NAV} />
      <Link to="/admin/recruitment" className="mb-4 inline-block text-sm text-muted hover:text-fg">
        ← Recruitment projects
      </Link>

      {isUnauthenticated(poolQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a recruitment, manager or admin account to search the talent pool.</p>
        </Panel>
      ) : null}

      <Panel className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label-mono">Search name or email</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. jane@example.zm"
              className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50"
            />
          </label>
          <label>
            <span className="label-mono">Filter by tag</span>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. data-analyst"
              className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50"
            />
          </label>
        </div>
      </Panel>

      <div className="space-y-3 pb-14">
        {poolQuery.isLoading ? (
          <Panel className="py-10 text-center text-sm text-muted">Searching…</Panel>
        ) : results.length === 0 ? (
          <Panel className="py-10 text-center text-sm text-muted">No candidates match.</Panel>
        ) : (
          results.map((c) => (
            <Panel key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-display text-lg tracking-tight">{c.candidateName}</div>
                  <div className="mt-1 text-sm text-muted">
                    {c.candidateEmail ?? "No email"} · {c.projectTitle}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone="amber">{c.stage.replace(/_/g, " ")}</Chip>
                    {c.tags.map((t) => (
                      <Chip key={t} tone="muted">
                        {t}
                      </Chip>
                    ))}
                  </div>
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = tagDrafts[c.id]?.trim();
                    if (value) {
                      addTag.mutate({ id: c.id, value });
                      setTagDrafts((prev) => ({ ...prev, [c.id]: "" }));
                    }
                  }}
                >
                  <input
                    value={tagDrafts[c.id] ?? ""}
                    onChange={(e) => setTagDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="Add tag"
                    className="w-28 rounded-md bg-surface-2 px-2 py-1.5 text-xs outline-none ring-1 ring-line"
                  />
                  <button
                    type="submit"
                    disabled={addTag.isPending}
                    className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                  >
                    Add
                  </button>
                </form>
              </div>
            </Panel>
          ))
        )}
      </div>
    </SiteShell>
  );
}
