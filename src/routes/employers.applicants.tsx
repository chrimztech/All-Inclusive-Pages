import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { ORG } from "@/lib/eoz-data";
import {
  api,
  isUnauthenticated,
  ApiError,
  API_BASE_URL,
  type PageResponse,
  type ApiApplication,
} from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/employers/applicants")({
  head: () => ({
    meta: [
      { title: "Applicants — EOZ Employer Portal" },
      {
        name: "description",
        content:
          "Review candidates who applied through EOZ, and see interest for listings routed to your own channel.",
      },
      { property: "og:title", content: "Applicants — EOZ Employer Portal" },
      {
        property: "og:description",
        content:
          "Screen EOZ-hosted applicants with their CV, or view save/view counts for externally-routed listings.",
      },
    ],
  }),
  component: Applicants,
});

type EmployerOpportunity = {
  id: string;
  title: string;
  region: string | null;
  applicationMode: string;
  viewsCount: number;
  savesCount: number;
  status: string;
};

const STATUS_OPTIONS = [
  "SUBMITTED",
  "SCREENING",
  "LONGLISTED",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
];

function Applicants() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["employer", "opportunities", "mine"],
    queryFn: () => api.get<PageResponse<EmployerOpportunity>>("/opportunities/mine", { size: 50 }),
    retry: false,
  });

  const rows = (data?.items ?? []).filter((o) => o.status === "PUBLISHED" || o.status === "CLOSED");
  const hostedRows = rows.filter((o) => o.applicationMode === "EOZ_HOSTED");
  const externalRows = rows.filter((o) => o.applicationMode !== "EOZ_HOSTED");
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const activeListing = hostedRows.find((r) => r.id === activeListingId) ?? hostedRows[0] ?? null;

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.3 ) — Applicants"
        title="Screen who actually applied."
        lead="EOZ-hosted listings collect full applications with CVs, right here. Listings routed to your own channel only show view/save interest."
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as an employer to see applicants.</p>
        </Panel>
      ) : null}

      {isLoading ? (
        <Panel className="mb-6 py-6 text-center text-sm text-muted">Loading…</Panel>
      ) : (
        <>
          {hostedRows.length ? (
            <Panel className="mb-6">
              <div className="label-mono mb-3">EOZ-hosted listings</div>
              <div className="mb-4 flex flex-wrap gap-2">
                {hostedRows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveListingId(r.id)}
                    className={
                      (activeListing?.id === r.id
                        ? "accent-gradient text-ink"
                        : "text-muted ring-1 ring-line hover:text-fg") +
                      " rounded-md px-3 py-1.5 text-xs font-medium"
                    }
                  >
                    {r.title}
                  </button>
                ))}
              </div>
              {activeListing ? <ApplicantList opportunityId={activeListing.id} /> : null}
            </Panel>
          ) : null}

          <Panel className="mb-4 overflow-x-auto">
            <div className="label-mono mb-3">Interest on externally-routed listings</div>
            {externalRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                No externally-routed listings yet.
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="label-mono">
                    <th className="pb-3">Listing</th>
                    <th className="pb-3">Region</th>
                    <th className="pb-3">Views</th>
                    <th className="pb-3">Saves</th>
                  </tr>
                </thead>
                <tbody>
                  {externalRows.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="py-3 pr-4">{r.title}</td>
                      <td className="py-3 pr-4 text-muted">{r.region ?? "National"}</td>
                      <td className="py-3 pr-4">{r.viewsCount}</td>
                      <td className="py-3 pr-4 text-muted">{r.savesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}

      <Panel className="mb-14">
        <p className="text-xs text-muted">{ORG.disclaimer}</p>
      </Panel>
    </SiteShell>
  );
}

function ApplicantList({ opportunityId }: { opportunityId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["employer", "applications", opportunityId],
    queryFn: () => api.get<ApiApplication[]>(`/opportunities/${opportunityId}/applications`),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/applications/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "applications", opportunityId] });
      toast("Status updated.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not update status.", "error"),
  });

  if (query.isLoading) {
    return <p className="py-6 text-center text-sm text-muted">Loading applicants…</p>;
  }
  const applications = query.data ?? [];
  if (applications.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">No applications yet for this listing.</p>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((a) => (
        <div key={a.id} className="rounded-md bg-surface-2 p-4 ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{a.candidateName}</div>
              <div className="text-xs text-muted">{a.candidateEmail}</div>
            </div>
            <div className="flex items-center gap-2">
              <Chip
                tone={
                  a.status === "HIRED" ? "emerald" : a.status === "REJECTED" ? "rose" : "accent"
                }
              >
                {a.status}
              </Chip>
              <select
                value={a.status}
                onChange={(e) => statusMutation.mutate({ id: a.id, status: e.target.value })}
                disabled={statusMutation.isPending}
                className="rounded-md bg-ink px-2 py-1 text-xs outline-none ring-1 ring-line"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {a.coverNote ? <p className="mt-3 text-sm text-muted">{a.coverNote}</p> : null}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-muted">
              Applied {new Date(a.submittedAt).toLocaleDateString()}
            </span>
            {a.resumeFileId ? (
              <a
                href={`${API_BASE_URL}/applications/${a.id}/resume`}
                target="_blank"
                rel="noreferrer"
                className="text-accent-soft hover:text-fg"
              >
                Download CV →
              </a>
            ) : (
              <span className="text-muted">No CV attached</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
