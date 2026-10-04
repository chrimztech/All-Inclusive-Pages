import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Eye, EyeOff, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import {
  api,
  ApiError,
  isUnauthenticated,
  type ApiInformationArticle,
  type InformationArticleCategory,
  type PageResponse,
} from "@/lib/api-client";
import {
  INFORMATION_CATEGORIES,
  INFORMATION_CATEGORY_KEYS,
  articleDate,
} from "@/lib/information-hub";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/information-hub")({
  head: () => ({
    meta: [
      { title: "Information Hub - EOZ Staff" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InformationHubAdmin,
});

type ArticleDraft = {
  title: string;
  excerpt: string;
  body: string;
  category: InformationArticleCategory;
  featured: boolean;
  sourceName: string;
  sourceUrl: string;
};

const EMPTY_DRAFT: ArticleDraft = {
  title: "",
  excerpt: "",
  body: "",
  category: "APPLICATION_ADVICE",
  featured: false,
  sourceName: "",
  sourceUrl: "",
};

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/40";

function InformationHubAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ArticleDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin", "information-hub"],
    queryFn: () =>
      api.get<PageResponse<ApiInformationArticle>>("/admin/information-hub", { size: 100 }),
    retry: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "information-hub"] });
    queryClient.invalidateQueries({ queryKey: ["information-hub"] });
  };

  const showError = (error: unknown, fallback: string) =>
    toast(error instanceof ApiError ? error.message : fallback, "error");

  const save = useMutation({
    mutationFn: (body: ArticleDraft) =>
      editingId
        ? api.patch<ApiInformationArticle>(`/admin/information-hub/${editingId}`, body)
        : api.post<ApiInformationArticle>("/admin/information-hub", body),
    onSuccess: () => {
      refresh();
      toast(editingId ? "Guide updated." : "Guide saved as a draft.");
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
    },
    onError: (error) => showError(error, "Could not save the guide."),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "publish" | "unpublish" }) =>
      api.post<ApiInformationArticle>(`/admin/information-hub/${id}/${action}`),
    onSuccess: (_, variables) => {
      refresh();
      toast(variables.action === "publish" ? "Guide published." : "Guide returned to drafts.");
    },
    onError: (error) => showError(error, "Could not change the guide status."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/information-hub/${id}`),
    onSuccess: () => {
      refresh();
      toast("Guide deleted.");
      if (editingId) {
        setEditingId(null);
        setDraft(EMPTY_DRAFT);
      }
    },
    onError: (error) => showError(error, "Could not delete the guide."),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({
      ...draft,
      title: draft.title.trim(),
      excerpt: draft.excerpt.trim(),
      body: draft.body.trim(),
      sourceName: draft.sourceName.trim(),
      sourceUrl: draft.sourceUrl.trim(),
    });
  };

  const edit = (article: ApiInformationArticle) => {
    setEditingId(article.id);
    setDraft({
      title: article.title,
      excerpt: article.excerpt,
      body: article.body,
      category: article.category,
      featured: article.featured,
      sourceName: article.sourceName ?? "",
      sourceUrl: article.sourceUrl ?? "",
    });
    window.setTimeout(
      () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  };

  const items = listQuery.data?.items ?? [];
  const publishedCount = items.filter((article) => article.status === "PUBLISHED").length;
  const draftCount = items.length - publishedCount;

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.15 ) - Information Hub"
        title="Useful guidance, carefully managed."
        lead="Create clear, practical guides for the public hub. Drafts remain private until a content officer publishes them."
        aside={
          <Panel className="grid grid-cols-2 gap-4">
            <div>
              <div className="label-mono">Published</div>
              <div className="mt-2 font-display text-3xl text-accent-soft">{publishedCount}</div>
            </div>
            <div>
              <div className="label-mono">Drafts</div>
              <div className="mt-2 font-display text-3xl text-amber">{draftCount}</div>
            </div>
          </Panel>
        }
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(listQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">
            Sign in with a content, manager or administrator account to manage the Information Hub.
          </p>
        </Panel>
      ) : null}

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div ref={formRef} className="scroll-mt-24 lg:col-span-5">
          <Panel>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="label-mono">{editingId ? "Editing guide" : "New guide"}</div>
                <h2 className="mt-1 font-display text-xl tracking-tight">
                  {editingId ? "Update the content" : "Add to the library"}
                </h2>
              </div>
              {editingId ? (
                <Pencil aria-hidden="true" className="size-5 text-accent-soft" />
              ) : (
                <Plus aria-hidden="true" className="size-5 text-accent-soft" />
              )}
            </div>

            <form className="grid gap-4" onSubmit={submit}>
              <label className="text-xs text-muted">
                Title
                <input
                  required
                  maxLength={180}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  className={inputCls}
                  placeholder="A clear, specific promise to the reader"
                />
                <span className="mt-1 block text-right font-mono text-[10px]">
                  {draft.title.length}/180
                </span>
              </label>

              <label className="text-xs text-muted">
                Topic
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      category: event.target.value as InformationArticleCategory,
                    })
                  }
                  className={inputCls}
                >
                  {INFORMATION_CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {INFORMATION_CATEGORIES[key].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-muted">
                Short introduction
                <textarea
                  required
                  maxLength={360}
                  rows={3}
                  value={draft.excerpt}
                  onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
                  className={inputCls}
                  placeholder="What will the reader understand or be able to do?"
                />
                <span className="mt-1 block text-right font-mono text-[10px]">
                  {draft.excerpt.length}/360
                </span>
              </label>

              <label className="text-xs text-muted">
                Guide body
                <textarea
                  required
                  minLength={80}
                  maxLength={20000}
                  rows={12}
                  value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                  className={`${inputCls} leading-6`}
                  placeholder="Write in plain language. Leave a blank line between paragraphs."
                />
                <span className="mt-1 flex justify-between font-mono text-[10px]">
                  <span>{draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0} words</span>
                  <span>{draft.body.length}/20,000</span>
                </span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted">
                  Source name (optional)
                  <input
                    maxLength={160}
                    value={draft.sourceName}
                    onChange={(event) => setDraft({ ...draft, sourceName: event.target.value })}
                    className={inputCls}
                    placeholder="e.g. Ministry of Labour"
                  />
                </label>
                <label className="text-xs text-muted">
                  Source URL (optional)
                  <input
                    type="url"
                    maxLength={1000}
                    value={draft.sourceUrl}
                    onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
                    className={inputCls}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-xl bg-white/[0.025] p-3 ring-1 ring-line">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}
                  className="mt-0.5 size-4"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <Sparkles aria-hidden="true" className="size-3.5 text-amber" />
                    Feature this guide
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted">
                    Featured guides receive prominent placement on the public hub.
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={
                    save.isPending ||
                    !draft.title.trim() ||
                    !draft.excerpt.trim() ||
                    draft.body.trim().length < 80
                  }
                  className="btn-primary px-4 py-2.5 text-sm disabled:opacity-60"
                >
                  {save.isPending ? "Saving..." : editingId ? "Save changes" : "Save draft"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraft(EMPTY_DRAFT);
                    }}
                    className="btn-secondary px-4 py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </Panel>
        </div>

        <div className="space-y-3 lg:col-span-7">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="label-mono">Library</div>
              <h2 className="mt-1 font-display text-2xl tracking-tight">All guides</h2>
            </div>
            <Link
              to="/information-hub"
              className="inline-flex items-center gap-1.5 text-xs text-accent-soft hover:text-fg"
            >
              View public hub
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          {listQuery.isLoading ? (
            <>
              <div className="skeleton h-44 rounded-2xl" />
              <div className="skeleton h-44 rounded-2xl" />
            </>
          ) : null}

          {listQuery.isSuccess && items.length === 0 ? (
            <Panel className="py-12 text-center">
              <BookOpen aria-hidden="true" className="mx-auto size-7 text-muted" />
              <p className="mt-3 text-sm text-muted">No guides yet. Create the first draft.</p>
            </Panel>
          ) : null}

          {items.map((article) => (
            <Panel key={article.id} className="p-0">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Chip tone={article.status === "PUBLISHED" ? "emerald" : "amber"}>
                        {article.status === "PUBLISHED" ? "Published" : "Draft"}
                      </Chip>
                      <Chip tone="muted">
                        {INFORMATION_CATEGORIES[article.category].shortLabel}
                      </Chip>
                      {article.featured ? <Chip tone="amber">Featured</Chip> : null}
                    </div>
                    <h3 className="font-display text-xl leading-tight tracking-tight">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                      {article.excerpt}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Edit guide" onClick={() => edit(article)}>
                      <Pencil aria-hidden="true" className="size-3.5" />
                    </IconButton>
                    <IconButton
                      label={article.status === "PUBLISHED" ? "Unpublish guide" : "Publish guide"}
                      onClick={() =>
                        changeStatus.mutate({
                          id: article.id,
                          action: article.status === "PUBLISHED" ? "unpublish" : "publish",
                        })
                      }
                    >
                      {article.status === "PUBLISHED" ? (
                        <EyeOff aria-hidden="true" className="size-3.5" />
                      ) : (
                        <Eye aria-hidden="true" className="size-3.5" />
                      )}
                    </IconButton>
                    <IconButton
                      label="Delete guide"
                      danger
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${article.title}"? This permanently removes it from the hub.`,
                          )
                        ) {
                          remove.mutate(article.id);
                        }
                      }}
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </IconButton>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 font-mono text-[10px] tracking-wide text-muted uppercase">
                <span>
                  {article.status === "PUBLISHED"
                    ? `Published ${articleDate(article.publishedAt)}`
                    : `Updated ${articleDate(article.updatedAt)}`}
                  {` · ${article.readingMinutes} min read`}
                </span>
                {article.status === "PUBLISHED" ? (
                  <Link
                    to="/information-hub/$slug"
                    params={{ slug: article.slug }}
                    className="inline-flex items-center gap-1 text-accent-soft hover:text-fg"
                  >
                    Preview
                    <ArrowUpRight aria-hidden="true" className="size-3" />
                  </Link>
                ) : null}
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
