import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Categories — EOZ Staff Console" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Categories,
});

type Category = { id: string; code: string; name: string; description: string | null; listingCount: number };

const inputCls = "w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function Categories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const listQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => api.get<Category[]>("/admin/categories"),
    retry: false,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };
  const fail = (fallback: string) => (error: unknown) =>
    toast(error instanceof ApiError ? error.message : fallback, "error");

  const create = useMutation({
    mutationFn: () => api.post("/admin/categories", { name, description }),
    onSuccess: () => {
      refresh();
      setAdding(false);
      setName("");
      setDescription("");
      toast("Category added.");
    },
    onError: fail("Could not add the category."),
  });
  const update = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/categories/${id}`, { name: editName, description: editDescription }),
    onSuccess: () => {
      refresh();
      setEditingId(null);
      toast("Category updated.");
    },
    onError: fail("Could not update the category."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/categories/${id}`),
    onSuccess: () => {
      refresh();
      toast("Category deleted.");
    },
    onError: fail("Could not delete the category."),
  });

  const categories = listQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="Categories"
        title="How opportunities are grouped."
        lead="Categories appear in the opportunity filters and on the posting form. A category that listings still use can be renamed but not deleted."
        aside={
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="press accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
          >
            {adding ? "Cancel" : "+ Add category"}
          </button>
        }
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(listQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with an administrator account to manage categories.</p>
        </Panel>
      ) : null}

      {adding ? (
        <Panel className="mb-6">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label className="text-xs text-muted">
              Name
              <input required value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
            <label className="text-xs text-muted">
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
            <button
              type="submit"
              disabled={create.isPending || !name.trim()}
              className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {create.isPending ? "Adding…" : "Add"}
            </button>
          </form>
        </Panel>
      ) : null}

      <Panel className="mb-14">
        <div className="divide-y divide-line">
          {categories.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
              {editingId === c.id ? (
                <form
                  className="flex flex-1 flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    update.mutate(c.id);
                  }}
                >
                  <input
                    aria-label="Name"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`${inputCls} max-w-[14rem]`}
                  />
                  <input
                    aria-label="Description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="submit"
                    disabled={update.isPending || !editName.trim()}
                    className="accent-gradient rounded-md px-3 py-2 text-xs font-medium text-ink disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="font-mono text-[10px] text-muted">{c.code}</span>
                    </div>
                    <div className="text-xs text-muted">{c.description || "No description"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      {c.listingCount} listing{c.listingCount === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                        setEditDescription(c.description ?? "");
                      }}
                      className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={c.listingCount > 0 || remove.isPending}
                      title={c.listingCount > 0 ? "Used by listings — cannot be deleted" : undefined}
                      onClick={() => {
                        if (window.confirm(`Delete the category "${c.name}"?`)) remove.mutate(c.id);
                      }}
                      className="rounded-md px-3 py-1 text-xs text-rose ring-1 ring-rose/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </SiteShell>
  );
}
