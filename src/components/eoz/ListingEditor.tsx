import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { REGIONS } from "@/lib/eoz-data";
import { useToast } from "@/lib/toast";

type Detail = {
  id: string;
  title: string;
  categoryCode: string;
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  location: string | null;
  region: string | null;
  workMode: string | null;
  deadline: string | null;
  applicationMode: string;
  applicationUrl: string | null;
  applicationEmail: string | null;
  applicationAddress: string | null;
  source: string | null;
};

type Category = { code: string; name: string };

const APPLICATION_MODE_OPTIONS = [
  { value: "EMPLOYER_EMAIL", label: "By email" },
  { value: "EOZ_HOSTED", label: "Apply on EOZ (no portal needed)" },
  { value: "PHYSICAL_ADDRESS", label: "In person or by post" },
  { value: "EXTERNAL_URL", label: "Online portal or website" },
];

const inputCls = "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Edits a listing the signed-in user is allowed to manage. When an employer saves, the listing goes back into the
 * review queue; staff edits keep the current status.
 */
export function ListingEditor({
  opportunityId,
  isStaff,
  invalidateKeys,
  onClose,
}: {
  opportunityId: string;
  isStaff: boolean;
  invalidateKeys: string[][];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const detailQuery = useQuery({
    queryKey: ["opportunity", "manage", opportunityId],
    queryFn: () => api.get<Detail>(`/opportunities/manage/${opportunityId}`),
    retry: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    const d = detailQuery.data;
    if (d) {
      setForm({
        title: d.title,
        categoryCode: d.categoryCode,
        description: d.description ?? "",
        responsibilities: d.responsibilities ?? "",
        requirements: d.requirements ?? "",
        benefits: d.benefits ?? "",
        location: d.location ?? "",
        region: d.region ?? "",
        workMode: d.workMode ?? "",
        deadline: toLocalInput(d.deadline),
        applicationMode: d.applicationMode,
        applicationUrl: d.applicationUrl ?? "",
        applicationEmail: d.applicationEmail ?? "",
        applicationAddress: d.applicationAddress ?? "",
        source: d.source ?? "",
      });
    }
  }, [detailQuery.data]);

  const set = (key: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/opportunities/manage/${opportunityId}`, {
        ...form,
        deadline: form["deadline"] ? new Date(form["deadline"]).toISOString() : undefined,
      }),
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      toast(isStaff ? "Listing updated." : "Listing updated and sent back for review.");
      onClose();
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save the listing.", "error"),
  });

  if (detailQuery.isLoading) return <p className="mt-4 text-sm text-muted">Loading listing…</p>;
  if (detailQuery.isError) {
    return (
      <p className="mt-4 text-sm text-rose">
        {detailQuery.error instanceof ApiError ? detailQuery.error.message : "Could not load the listing."}
      </p>
    );
  }

  const mode = form["applicationMode"] ?? detailQuery.data?.applicationMode;
  // Staff-only routes (e.g. information-only) stay selectable when a listing already uses them.
  const modeOptions = APPLICATION_MODE_OPTIONS.some((o) => o.value === mode) || !mode
    ? APPLICATION_MODE_OPTIONS
    : [...APPLICATION_MODE_OPTIONS, { value: mode, label: mode.replace(/_/g, " ").toLowerCase() }];

  return (
    <form
      className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      {!isStaff ? (
        <p className="text-xs text-amber sm:col-span-2">
          Saving sends this listing back to the review queue, so a reviewer can re-check the changes before it is live.
        </p>
      ) : null}
      <label className="text-xs text-muted sm:col-span-2">
        Title
        <input required value={form["title"] ?? ""} onChange={set("title")} className={inputCls} />
      </label>
      <label className="text-xs text-muted">
        Category
        <select value={form["categoryCode"] ?? ""} onChange={set("categoryCode")} className={inputCls}>
          {(categoriesQuery.data ?? []).map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        Closing date
        <input type="datetime-local" value={form["deadline"] ?? ""} onChange={set("deadline")} className={inputCls} />
      </label>
      <label className="text-xs text-muted sm:col-span-2">
        Description
        <textarea required rows={5} value={form["description"] ?? ""} onChange={set("description")} className={inputCls} />
      </label>
      <label className="text-xs text-muted">
        Responsibilities
        <textarea rows={3} value={form["responsibilities"] ?? ""} onChange={set("responsibilities")} className={inputCls} />
      </label>
      <label className="text-xs text-muted">
        Requirements
        <textarea rows={3} value={form["requirements"] ?? ""} onChange={set("requirements")} className={inputCls} />
      </label>
      <label className="text-xs text-muted sm:col-span-2">
        Benefits
        <textarea rows={2} value={form["benefits"] ?? ""} onChange={set("benefits")} className={inputCls} />
      </label>
      <label className="text-xs text-muted">
        Location
        <input value={form["location"] ?? ""} onChange={set("location")} className={inputCls} />
      </label>
      <label className="text-xs text-muted">
        Region
        <select value={form["region"] ?? ""} onChange={set("region")} className={inputCls}>
          <option value="">—</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted sm:col-span-2">
        How candidates apply
        <select value={mode ?? ""} onChange={set("applicationMode")} className={inputCls}>
          {modeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {mode === "EXTERNAL_URL" ? (
        <label className="text-xs text-muted sm:col-span-2">
          Application link
          <input required type="url" value={form["applicationUrl"] ?? ""} onChange={set("applicationUrl")} className={inputCls} />
        </label>
      ) : null}
      {mode === "EMPLOYER_EMAIL" ? (
        <label className="text-xs text-muted sm:col-span-2">
          Application email
          <input required type="email" value={form["applicationEmail"] ?? ""} onChange={set("applicationEmail")} className={inputCls} />
        </label>
      ) : null}
      {mode === "PHYSICAL_ADDRESS" ? (
        <label className="text-xs text-muted sm:col-span-2">
          Application address
          <input required value={form["applicationAddress"] ?? ""} onChange={set("applicationAddress")} className={inputCls} />
        </label>
      ) : null}
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={save.isPending || !form["title"]?.trim()}
          className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : isStaff ? "Save changes" : "Save and resubmit"}
        </button>
        <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg">
          Cancel
        </button>
      </div>
    </form>
  );
}
