import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav, StatTile } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/recruitment")({ head: () => ({ meta: [{ title: "Recruitment Operations — EOZ Staff" }] }), component: Recruitment });

type ProjectRow = {
  id: string;
  reference: string;
  title: string;
  organisationName: string | null;
  status: string;
  createdAt: string;
};

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50";

function Recruitment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [confidentiality, setConfidentiality] = useState("STANDARD");

  const projectsQuery = useQuery({
    queryKey: ["admin", "recruitment-projects"],
    queryFn: () => api.get<PageResponse<ProjectRow>>("/recruitment/projects", { size: 50 }),
    retry: false,
  });
  const projects = projectsQuery.data?.items ?? [];
  const openCount = projects.filter((p) => p.status === "OPEN").length;

  const create = useMutation({
    mutationFn: () => api.post("/recruitment/projects", { title, confidentiality }),
    onSuccess: () => {
      setTitle("");
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "recruitment-projects"] });
      toast("Project created.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not create the project.", "error"),
  });

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.7 ) — Recruitment"
        title="Move candidates forward with care."
        lead="Keep client-visible notes separate from private internal notes, and make every stage transition reviewable."
        aside={
          <Panel>
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              New project
            </button>
            <Link
              to="/admin/recruitment/talent-pool"
              className="mt-2 block rounded-md px-4 py-2 text-center text-sm text-muted ring-1 ring-line hover:text-fg"
            >
              Search talent pool →
            </Link>
          </Panel>
        }
      />
      <DashNav items={ADMIN_NAV} />
      {isUnauthenticated(projectsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a recruitment, manager or admin account to view projects.</p>
        </Panel>
      ) : null}

      {creating ? (
        <Panel className="mb-6">
          <form
            className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label>
              <span className="label-mono">Project title</span>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
            </label>
            <label>
              <span className="label-mono">Confidentiality</span>
              <select value={confidentiality} onChange={(e) => setConfidentiality(e.target.value)} className={field}>
                <option value="STANDARD">Standard</option>
                <option value="CONFIDENTIAL">Confidential</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={create.isPending}
              className="accent-gradient self-end rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </form>
        </Panel>
      ) : null}

      <div className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active projects" value={String(openCount)} />
        <StatTile label="Total projects" value={String(projects.length)} />
      </div>
      <Panel className="mb-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label-mono">Recruitment projects</div>
            <h2 className="mt-1 font-display text-2xl">Open engagements</h2>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="label-mono">
              <tr>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Title</th>
                <th className="pb-3">Organisation</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="py-4 font-mono text-xs text-accent-soft">{p.reference}</td>
                  <td className="py-4">
                    <Link
                      to="/admin/recruitment/$projectId"
                      params={{ projectId: p.id }}
                      className="hover:text-accent-soft"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="py-4 text-muted">{p.organisationName ?? "—"}</td>
                  <td className="py-4">
                    <Chip tone={p.status === "OPEN" ? "emerald" : p.status === "CLOSED" ? "muted" : "amber"}>{p.status}</Chip>
                  </td>
                </tr>
              ))}
              {!projectsQuery.isLoading && projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-muted">
                    No recruitment projects yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </SiteShell>
  );
}
