import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import {
  api,
  ApiError,
  isUnauthenticated,
  BUSINESS_TYPE_LABELS,
  SIZE_BAND_LABELS,
  type ApiOrganisation,
  type PageResponse,
  type OrganisationSizeBand,
} from "@/lib/api-client";
import { useToast } from "@/lib/toast";
import { Fragment, useState } from "react";
import { VerificationDocuments, VerificationReviews } from "@/components/eoz/VerificationDocuments";
import type { BusinessType } from "@/lib/api-client";
import { useCan } from "@/lib/use-current-user";
import { FormErrorSummary } from "@/components/eoz/FormErrorSummary";

export const Route = createFileRoute("/admin/organisations")({
  head: () => ({
    meta: [
      { title: "Organisations — EOZ Staff Console" },
      {
        name: "description",
        content:
          "Verify employers, funders and institutions before their listings reach candidates.",
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

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function CreateOrganisationPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    legalName: "",
    tradingName: "",
    businessType: "LIMITED_COMPANY",
    sizeBand: "",
    registrationNumber: "",
    sector: "",
    website: "",
    address: "",
    contactPersonName: "",
    contactPersonRole: "",
    contactPhone: "",
  });

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const create = useMutation({
    mutationFn: (_postAfterCreating: boolean) =>
      api.post<ApiOrganisation>("/organisations", {
        legalName: form.legalName.trim(),
        tradingName: form.tradingName.trim() || undefined,
        businessType: form.businessType || undefined,
        sizeBand: form.sizeBand || undefined,
        registrationNumber: form.registrationNumber.trim() || undefined,
        sector: form.sector.trim() || undefined,
        website: form.website.trim() || undefined,
        address: form.address.trim() || undefined,
        contactPersonName: form.contactPersonName.trim() || undefined,
        contactPersonRole: form.contactPersonRole.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      }),
    onSuccess: (organisation, postAfterCreating) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "organisations"] });
      void queryClient.invalidateQueries({ queryKey: ["post-for", "organisations"] });
      toast(`${organisation.tradingName ?? organisation.legalName} created.`);
      if (postAfterCreating) {
        void navigate({
          to: "/employers/post",
          search: {
            organisationId: organisation.id,
            organisationName: organisation.tradingName ?? organisation.legalName,
            organisationStatus: organisation.verificationStatus,
          },
        });
      } else {
        onClose();
      }
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not create the company.", "error"),
  });

  return (
    <Panel className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="label-mono">New company / organisation</div>
          <h2 className="mt-1 font-display text-2xl">Create the profile first.</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            The profile starts as pending verification. You can still draft or publish a checked
            listing for it immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg"
        >
          Cancel
        </button>
      </div>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          create.mutate(submitter?.value === "post");
        }}
      >
        <label className="sm:col-span-2">
          <span className="label-mono">Legal name</span>
          <input
            required
            autoFocus
            value={form.legalName}
            onChange={set("legalName")}
            placeholder="e.g. Copperbelt Engineering Limited"
            className={inputCls}
          />
        </label>
        <label>
          <span className="label-mono">Trading name</span>
          <input
            value={form.tradingName}
            onChange={set("tradingName")}
            placeholder="Optional public name"
            className={inputCls}
          />
        </label>
        <label>
          <span className="label-mono">Business type</span>
          <select value={form.businessType} onChange={set("businessType")} className={inputCls}>
            {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((type) => (
              <option key={type} value={type}>
                {BUSINESS_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label-mono">Team size</span>
          <select value={form.sizeBand} onChange={set("sizeBand")} className={inputCls}>
            <option value="">Not set</option>
            {(Object.keys(SIZE_BAND_LABELS) as OrganisationSizeBand[]).map((size) => (
              <option key={size} value={size}>
                {SIZE_BAND_LABELS[size]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label-mono">Registration number</span>
          <input
            value={form.registrationNumber}
            onChange={set("registrationNumber")}
            placeholder="Optional for informal businesses"
            className={inputCls}
          />
        </label>
        <label>
          <span className="label-mono">Sector</span>
          <input value={form.sector} onChange={set("sector")} className={inputCls} />
        </label>
        <label>
          <span className="label-mono">Website</span>
          <input
            value={form.website}
            onChange={set("website")}
            placeholder="https://example.com"
            className={inputCls}
          />
        </label>
        <label className="sm:col-span-2">
          <span className="label-mono">Address / location</span>
          <input value={form.address} onChange={set("address")} className={inputCls} />
        </label>
        <label>
          <span className="label-mono">Contact person</span>
          <input
            value={form.contactPersonName}
            onChange={set("contactPersonName")}
            className={inputCls}
          />
        </label>
        <label>
          <span className="label-mono">Contact role</span>
          <input
            value={form.contactPersonRole}
            onChange={set("contactPersonRole")}
            className={inputCls}
          />
        </label>
        <label>
          <span className="label-mono">Contact phone</span>
          <input
            type="tel"
            value={form.contactPhone}
            onChange={set("contactPhone")}
            className={inputCls}
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <FormErrorSummary error={create.error} labels={{ legalName: "Legal name" }} />
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            value="post"
            disabled={create.isPending || !form.legalName.trim()}
            className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create & post listing"}
          </button>
          <button
            type="submit"
            value="save"
            disabled={create.isPending || !form.legalName.trim()}
            className="rounded-md px-4 py-2 text-sm text-fg ring-1 ring-line hover:bg-surface-2 disabled:opacity-60"
          >
            Create only
          </button>
        </div>
      </form>
    </Panel>
  );
}

function Organisations() {
  const can = useCan();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [docsFor, setDocsFor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const orgsQuery = useQuery({
    queryKey: ["admin", "organisations"],
    queryFn: () => api.get<PageResponse<OrganisationRow>>("/organisations", { size: 50 }),
    retry: false,
  });

  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
      notes,
    }: {
      id: string;
      decision: string;
      notes?: string | undefined;
    }) => api.patch(`/organisations/${id}/verification`, { decision, notes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organisations"] });
      queryClient.invalidateQueries({
        queryKey: ["organisations", variables.id, "verification-reviews"],
      });
      toast(
        variables.decision === "VERIFIED"
          ? "Organisation verified."
          : variables.decision === "SUSPENDED"
            ? "Organisation suspended."
            : "Organisation rejected.",
      );
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : "Could not update verification status.",
        "error",
      ),
  });

  const permanentDelete = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: string }) =>
      api.del(`/admin/permanent-delete/organisations/${id}?confirm=${encodeURIComponent(confirm)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organisations"] });
      toast("Organisation permanently deleted.");
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : "Could not delete the organisation.",
        "error",
      ),
  });

  const rows = orgsQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.2 ) — Organisations"
        title="Who is allowed to post."
        lead="Verification is per-organisation. A verified badge on a listing means the source and the employer were both checked."
        aside={
          can("ORGANISATION_VERIFY") ? (
            <Panel>
              <button
                type="button"
                onClick={() => setCreating((open) => !open)}
                aria-expanded={creating}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
              >
                {creating ? "Close company form" : "Create company"}
              </button>
            </Panel>
          ) : undefined
        }
      />
      <DashNav items={ADMIN_NAV} />

      {creating ? <CreateOrganisationPanel onClose={() => setCreating(false)} /> : null}

      {isUnauthenticated(orgsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">
            Sign in with a manager or admin account to review organisations.
          </p>
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
                      {can("OPPORTUNITY_CREATE") &&
                      o.verificationStatus !== "SUSPENDED" &&
                      o.verificationStatus !== "REJECTED" ? (
                        <Link
                          to="/employers/post"
                          search={{
                            organisationId: o.id,
                            organisationName: o.tradingName ?? o.legalName,
                            organisationStatus: o.verificationStatus,
                          }}
                          className="rounded-md px-3 py-1 text-xs text-accent-soft ring-1 ring-accent/30 hover:bg-surface-2"
                        >
                          Post a listing for them
                        </Link>
                      ) : null}
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
                          const notes = window.prompt(
                            "Verify this organisation. Reviewer notes (optional):",
                            "",
                          );
                          if (notes !== null)
                            decide.mutate({
                              id: o.id,
                              decision: "VERIFIED",
                              notes: notes.trim() || undefined,
                            });
                        }}
                        className="rounded-md px-3 py-1 text-xs text-emerald ring-1 ring-emerald/30 disabled:opacity-60"
                      >
                        Verify
                      </button>
                      <button
                        disabled={decide.isPending}
                        onClick={() => {
                          const notes = window.prompt(
                            "Reason for rejecting (the organisation will see this):",
                            "",
                          );
                          if (notes === null) return;
                          if (!notes.trim()) {
                            toast(
                              "A reason is required so the organisation knows what to fix.",
                              "error",
                            );
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
                      {can("SYSTEM_MANAGE") ? (
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
                      ) : null}
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
