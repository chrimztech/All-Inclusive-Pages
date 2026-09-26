import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, Pencil, Quote, Trash2 } from "lucide-react";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, ApiError, isUnauthenticated, type ApiTestimonial } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/testimonials")({
  head: () => ({
    meta: [{ title: "Testimonials - EOZ Staff" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: TestimonialsAdmin,
});

type Draft = {
  authorName: string;
  authorRole: string;
  quote: string;
  active: boolean;
  sortOrder: number;
};

const EMPTY: Draft = { authorName: "", authorRole: "", quote: "", active: true, sortOrder: 0 };

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/40";

function TestimonialsAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin", "testimonials"],
    queryFn: () => api.get<ApiTestimonial[]>("/admin/testimonials"),
    retry: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "testimonials"] });
    queryClient.invalidateQueries({ queryKey: ["testimonials"] });
  };
  const onError = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : "Could not save the testimonial.", "error");

  const save = useMutation({
    mutationFn: (body: Draft) =>
      editingId
        ? api.patch<ApiTestimonial>(`/admin/testimonials/${editingId}`, body)
        : api.post<ApiTestimonial>("/admin/testimonials", body),
    onSuccess: () => {
      refresh();
      toast(editingId ? "Testimonial updated." : "Testimonial added.");
      setDraft(EMPTY);
      setEditingId(null);
    },
    onError,
  });
  const toggle = useMutation({
    mutationFn: (t: ApiTestimonial) =>
      api.patch(`/admin/testimonials/${t.id}`, {
        authorName: t.authorName,
        authorRole: t.authorRole ?? "",
        quote: t.quote,
        active: !t.active,
        sortOrder: t.sortOrder,
      }),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/testimonials/${id}`),
    onSuccess: () => {
      refresh();
      toast("Testimonial deleted.");
    },
    onError,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ ...draft, authorName: draft.authorName.trim(), quote: draft.quote.trim() });
  };

  const items = listQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.14 ) - Testimonials"
        title="Voices on the home page."
        lead="Add, reorder and hide the testimonials shown to visitors. Only publish quotes you have permission to use."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(listQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">
            Sign in with an administrator account to manage testimonials.
          </p>
        </Panel>
      ) : null}
      {listQuery.error instanceof ApiError && listQuery.error.status === 403 ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Your role does not include managing site settings.</p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel className="p-6">
            <div className="mb-4 text-sm font-medium">
              {editingId ? "Edit testimonial" : "Add a testimonial"}
            </div>
            <form className="grid gap-3" onSubmit={submit}>
              <label className="text-xs text-muted">
                Name
                <input
                  required
                  maxLength={120}
                  value={draft.authorName}
                  onChange={(e) => setDraft({ ...draft, authorName: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Mutale K."
                />
              </label>
              <label className="text-xs text-muted">
                Role or context (optional)
                <input
                  maxLength={160}
                  value={draft.authorRole}
                  onChange={(e) => setDraft({ ...draft, authorRole: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Graduate trainee, Kitwe"
                />
              </label>
              <label className="text-xs text-muted">
                Quote
                <textarea
                  required
                  minLength={10}
                  maxLength={600}
                  rows={4}
                  value={draft.quote}
                  onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
                  className={inputCls}
                />
                <span className="mt-1 block text-right font-mono text-[10px]">
                  {draft.quote.length}/600
                </span>
              </label>
              <div className="flex flex-wrap items-end gap-4">
                <label className="text-xs text-muted">
                  Display order
                  <input
                    type="number"
                    value={draft.sortOrder}
                    onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
                    className={`${inputCls} w-24`}
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                    className="size-4"
                  />
                  Show on home page
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    save.isPending || draft.quote.trim().length < 10 || !draft.authorName.trim()
                  }
                  className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                >
                  {save.isPending ? "Saving…" : editingId ? "Save changes" : "Add testimonial"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraft(EMPTY);
                    }}
                    className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </Panel>
        </div>

        <div className="space-y-3 lg:col-span-7">
          {listQuery.isLoading ? <div className="skeleton h-28 rounded-2xl" /> : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <Panel className="py-10 text-center text-sm text-muted">
              No testimonials yet. The home page hides the section until at least one is active.
            </Panel>
          ) : null}
          {items.map((t) => (
            <Panel key={t.id} className={t.active ? "" : "opacity-60"}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Chip tone={t.active ? "emerald" : "muted"}>
                      {t.active ? "Shown" : "Hidden"}
                    </Chip>
                    <span className="font-mono text-[10px] text-muted">Order {t.sortOrder}</span>
                  </div>
                  <p className="flex gap-2 text-sm leading-6">
                    <Quote aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent-soft" />
                    {t.quote}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    — {t.authorName}
                    {t.authorRole ? `, ${t.authorRole}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton
                    label="Edit"
                    onClick={() => {
                      setEditingId(t.id);
                      setDraft({
                        authorName: t.authorName,
                        authorRole: t.authorRole ?? "",
                        quote: t.quote,
                        active: t.active,
                        sortOrder: t.sortOrder,
                      });
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton label={t.active ? "Hide" : "Show"} onClick={() => toggle.mutate(t)}>
                    {t.active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </IconButton>
                  <IconButton
                    label="Delete"
                    danger
                    onClick={() => {
                      if (window.confirm(`Delete the testimonial from ${t.authorName}?`))
                        remove.mutate(t.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}

function IconButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-md ring-1 transition-colors ${
        danger
          ? "text-rose ring-rose/30 hover:bg-rose/10"
          : "text-muted ring-line hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
