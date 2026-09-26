import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, BUSINESS_TYPE_LABELS, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { Fragment, useState } from "react";
import { VerificationDocuments, VerificationReviews } from "@/components/eoz/VerificationDocuments";
import type { BusinessType } from "@/lib/api-client";

export const Route = createFileRoute("/admin/organisations")({
  head: () => ({
    meta: [
      { title: "Organisations — EOZ Staff Console" },
      {
        name: "description",
        content: "Verify employers, funders and institutions before their listings reach candidates.",
      },
      { property: "og:title", content: "Organisations — EOZ Staff Console" },
      {
        property: "og:description",
        content: "Verification states and posting history for every organisation on the platform.",
      },
    ],
  }),
  component: Organisations,
});

type OrganisationRow = {
  id: string;
  legalName: string;
  tradingName: string | null;
  sector: string | null;
  website: string | null;
  verificationStatus: string;
  businessType: BusinessType | null;
  registrationNumber: string | null;
};

const tone: Record<string, "emerald" | "amber" | "muted" | "rose"> = {
  VERIFIED: "emerald",
  UNDER_REVIEW: "amber",
  PENDING: "muted",
  REJECTED: "rose",
  SUSPENDED: "rose",
};

function Organisations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [docsFor, setDocsFor] = useState<string | null>(null);
  const orgsQuery = useQuery({
    queryKey: ["admin", "organisations"],
    queryFn: () => api.get<PageResponse<OrganisationRow>>("/organisations", { size: 50 }),
    retry: false,
  });

  const decide = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: string; notes?: string | undefined }) =>
      api.patch(`/organisations/${id}/verification`, { decision, notes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organisations"] });
      queryClient.invalidateQueries({ queryKey: ["organisations", variables.id, "verification-reviews"] });
      toast(
        variables.decision === "VERIFIED"
          ? "Organisation verified."
          : variables.decision === "SUSPENDED"
            ? "Organisation suspended."
            : "Organisation rejected.",
      );
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update verification status.", "error"),
  });

  const permanentDelete = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: string }) =>
      api.del(`/admin/permanent-delete/organisations/${id}?confirm=${encodeURIComponent(confirm)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organisations"] });
      toast("Organisation permanently deleted.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not delete the organisation.", "error"),
  });

  const rows = orgsQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.2 ) — Organisations"
        title="Who is allowed to post."
        lead="Verification is per-organisation. A verified badge on a listing means the source and the employer were both checked."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(orgsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in with a manager or admin account to review organisations.</p>
        </Panel>
      ) : null}

      <Panel className="mb-14 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="label-mono">
              <th className="pb-3">Organisation</th>
              <th className="pb-3">State</th>
              <th className="pb-3">Business type</th>
              <th className="pb-3">Reg. number</th>
              <th className="pb-3">Sector</th>
              <th className="pb-3">Website</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <Fragment key={o.id}>
              <tr className="border-t border-line">
                <td className="py-3 pr-4">{o.tradingName ?? o.legalName}</td>
                <td className="py-3 pr-4">
                  <Chip tone={tone[o.verificationStatus] ?? "muted"}>{o.verificationStatus}</Chip>
                </td>
                <td className="py-3 pr-4 text-muted">
                  {o.businessType ? BUSINESS_TYPE_LABELS[o.businessType] : "—"}
                </td>
                <td className="py-3 pr-4 text-muted">{o.registrationNumber ?? "—"}</td>
                <td className="py-3 pr-4 text-muted">{o.sector ?? "—"}</td>
                <td className="py-3 pr-4 text-muted">{o.website ?? "—"}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setDocsFor(docsFor === o.id ? null : o.id)}
                      aria-expanded={docsFor === o.id}
                      className="rounded-md px-3 py-1 text-xs text-fg ring-1 ring-line hover:bg-surface-2"
                    >
                      {docsFor === o.id ? "Hide documents" : "Documents"}
                    </button>
                    <button
                      disabled={decide.isPending}
                      onClick={() => {
                        const notes = window.prompt("Verify this organisation. Reviewer notes (optional):", "");
                        if (notes !== null) decide.mutate({ id: o.id, decision: "VERIFIED", notes: notes.trim() || undefined });
                      }}
                      className="rounded-md px-3 py-1 text-xs text-emerald ring-1 ring-emerald/30 disabled:opacity-60"
                    >
                      Verify
                    </button>
                    <button
                      disabled={decide.isPending}
                      onClick={() => {
                        const notes = window.prompt("Reason for rejecting (the organisation will see this):", "");
                        if (notes === null) return;
                        if (!notes.trim()) {
                          toast("A reason is required so the organisation knows what to fix.", "error");
                          return;
                        }
                        decide.mutate({ id: o.id, decision: "REJECTED", notes: notes.trim() });
                      }}
                      className="rounded-md px-3 py-1 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                    >
                      Reject
                    </button>
                    {o.verificationStatus !== "SUSPENDED" ? (
                      <button
                        disabled={decide.isPending}
                        onClick={() => {
                          const notes = window.prompt(
                            `Suspend ${o.tradingName ?? o.legalName}? Its listings will no longer be publicly visible.\n\nReason (required):`,
                            "",
                          );
                          if (notes === null) return;
                          if (!notes.trim()) {
                            toast("A reason is required to suspend an organisation.", "error");
                            return;
                          }
                          decide.mutate({ id: o.id, decision: "SUSPENDED", notes: notes.trim() });
                        }}
                        className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                      >
                        Suspend
                      </button>
                    ) : null}
                    <button
                      disabled={permanentDelete.isPending}
                      onClick={() => {
                        const typed = window.prompt(
                          `PERMANENT DELETE. This erases ${o.legalName}, all of its listings and their applications. It cannot be undone.

Type the legal name (${o.legalName}) to confirm:`,
                        );
                        if (typed) permanentDelete.mutate({ id: o.id, confirm: typed });
                      }}
                      className="rounded-md px-3 py-1 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              {docsFor === o.id ? (
                <tr>
                  <td colSpan={7} className="pb-4">
                    <div className="rounded-xl bg-white/[0.02] p-4 ring-1 ring-line">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <VerificationDocuments organisationId={o.id} canUpload={false} />
                        <VerificationReviews organisationId={o.id} />
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Panel>
    </SiteShell>
  );
}
