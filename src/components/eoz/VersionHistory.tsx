import { useQuery } from "@tanstack/react-query";
import { Chip } from "@/components/eoz/SiteShell";
import { api, ApiError } from "@/lib/api-client";

type Version = {
  versionNo: number;
  status: string;
  snapshot: Record<string, unknown>;
  changedByName: string | null;
  createdAt: string;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  category: "Category",
  organisationName: "Organisation",
  description: "Description",
  responsibilities: "Responsibilities",
  requirements: "Requirements",
  benefits: "Benefits",
  location: "Location",
  region: "Region",
  workMode: "Work mode",
  employmentType: "Employment type",
  workArrangement: "Work arrangement",
  experienceLevel: "Experience level",
  salaryMin: "Salary from",
  salaryMax: "Salary to",
  deadline: "Deadline",
  applicationMode: "How to apply",
  applicationUrl: "Application link",
  applicationEmail: "Application email",
  applicationAddress: "Application address",
  source: "Source",
  status: "Status",
  verified: "Verified",
  featured: "Featured",
};

function show(value: unknown, field: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "deadline" && typeof value === "string") {
    return new Date(value).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" });
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value).replace(/_/g, " ");
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/** A listing's saved versions, newest first, each showing what changed from the one before. */
export function VersionHistory({ opportunityId }: { opportunityId: string }) {
  const historyQuery = useQuery({
    queryKey: ["opportunity", opportunityId, "versions"],
    queryFn: () => api.get<Version[]>(`/opportunities/manage/${opportunityId}/versions`),
    retry: false,
  });

  if (historyQuery.isLoading) return <div className="skeleton mt-4 h-20 rounded-xl" />;
  if (historyQuery.isError) {
    return (
      <p className="mt-4 text-xs text-rose">
        {historyQuery.error instanceof ApiError
          ? historyQuery.error.message
          : "Could not load the history."}
      </p>
    );
  }
  const versions = historyQuery.data ?? [];
  if (versions.length === 0) {
    return (
      <p className="mt-4 text-xs text-muted">
        No history recorded yet — it starts with the next change.
      </p>
    );
  }

  return (
    <ol className="mt-4 space-y-3 border-t border-line pt-4">
      {versions.map((v, i) => {
        const previous = versions[i + 1];
        const changes = previous
          ? Object.keys(FIELD_LABELS).filter(
              (f) =>
                JSON.stringify(v.snapshot[f] ?? null) !==
                JSON.stringify(previous.snapshot[f] ?? null),
            )
          : [];
        return (
          <li key={v.versionNo} className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-accent-soft">v{v.versionNo}</span>
              <Chip tone="muted">{v.status.replace(/_/g, " ")}</Chip>
              <span className="text-muted">
                {new Date(v.createdAt).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" })} ·{" "}
                {v.changedByName ?? "System"}
              </span>
            </div>
            {previous ? (
              changes.length ? (
                <ul className="mt-2 space-y-1 text-xs">
                  {changes.map((f) => (
                    <li key={f} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                      <span className="text-muted">{FIELD_LABELS[f]}</span>
                      <span>
                        <span className="text-rose/80 line-through">
                          {show(previous.snapshot[f], f)}
                        </span>
                        <span className="mx-1.5 text-muted">→</span>
                        <span className="text-emerald">{show(v.snapshot[f], f)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null
            ) : (
              <p className="mt-2 text-xs text-muted">First recorded version.</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
