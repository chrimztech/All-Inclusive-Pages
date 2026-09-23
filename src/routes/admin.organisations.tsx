import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, BUSINESS_TYPE_LABELS, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";
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
  const orgsQuery = useQuery({
    queryKey: ["admin", "organisations"],
    queryFn: () => api.get<PageResponse<OrganisationRow>>("/organisations", { size: 50 }),
    retry: false,
  });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) =>
      api.patch(`/organisations/${id}/verification`, { decision }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organisations"] });
      toast(variables.decision === "VERIFIED" ? "Organisation verified." : "Organisation rejected.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update verification status.", "error"),
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
              <tr key={o.id} className="border-t border-line">
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
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: o.id, decision: "VERIFIED" })}
                      className="rounded-md px-3 py-1 text-xs text-emerald ring-1 ring-emerald/30 disabled:opacity-60"
                    >
                      Verify
                    </button>
                    <button
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: o.id, decision: "REJECTED" })}
                      className="rounded-md px-3 py-1 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </SiteShell>
  );
}
