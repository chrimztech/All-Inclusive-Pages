import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { ORG, REGIONS } from "@/lib/eoz-data";
import { api, ApiError, type ApiCategory, type ApiOpportunityDetail } from "@/lib/api-client";

export const Route = createFileRoute("/employers/post")({
  head: () => ({
    meta: [
      { title: "Post an Opportunity — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Submit a job, internship, scholarship, grant, tender or training listing for verification and distribution by EOZ.",
      },
      { property: "og:title", content: "Post an Opportunity — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Submit a listing with your official application method for EOZ verification.",
      },
    ],
  }),
  component: PostOpportunity,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

const APPLICATION_MODES = [
  { value: "EXTERNAL_URL", label: "Employer application URL" },
  { value: "EMPLOYER_EMAIL", label: "Employer email address" },
  { value: "PHYSICAL_ADDRESS", label: "Physical / postal submission" },
] as const;

type ApplicationMode = (typeof APPLICATION_MODES)[number]["value"];

function PostOpportunity() {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<ApiCategory[]>("/categories"),
  });

  const [title, setTitle] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [region, setRegion] = useState(REGIONS[0] ?? "");
  const [organisationName, setOrganisationName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [applicationMode, setApplicationMode] = useState<ApplicationMode>("EXTERNAL_URL");
  const [routeValue, setRouteValue] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post<ApiOpportunityDetail>("/opportunities", {
        title,
        categoryCode,
        organisationName,
        description,
        requirements: requirements
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean)
          .join("; "),
        region,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        applicationMode,
        applicationUrl: applicationMode === "EXTERNAL_URL" ? routeValue : undefined,
        applicationEmail: applicationMode === "EMPLOYER_EMAIL" ? routeValue : undefined,
        applicationAddress: applicationMode === "PHYSICAL_ADDRESS" ? routeValue : undefined,
        source,
        salaryVisible: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  const routeFieldLabel =
    applicationMode === "EXTERNAL_URL"
      ? "Careers portal / application URL"
      : applicationMode === "EMPLOYER_EMAIL"
        ? "Employer email address"
        : "Physical submission address";

  if (submitMutation.isSuccess) {
    return (
      <SiteShell>
        <PageIntro
          eyebrow="( 05.2 ) — Submitted"
          title="Submitted for review."
          lead={`Reference ${submitMutation.data.reference} has been logged as pending review. EOZ staff will verify the application route before it is published.`}
        />
        <div className="pb-14" />
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.2 ) — Submit"
        title="Post an opportunity."
        lead="Every submission is reviewed by EOZ staff. Listings without a valid official application method are rejected."
      />
      <DashNav items={EMPLOYER_NAV} />

      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate();
              }}
            >
              <label className="sm:col-span-2">
                <span className="label-mono">Opportunity title</span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Senior Data Analyst"
                />
              </label>
              <label>
                <span className="label-mono">Category</span>
                <select
                  required
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {(categoriesQuery.data ?? []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-mono">Region</span>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-mono">Organisation</span>
                <input
                  required
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label>
                <span className="label-mono">Closing date</span>
                <input
                  required
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label>
                <span className="label-mono">Application route type</span>
                <select
                  value={applicationMode}
                  onChange={(e) => setApplicationMode(e.target.value as ApplicationMode)}
                  className={inputCls}
                >
                  {APPLICATION_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label-mono">{routeFieldLabel} (required)</span>
                <input
                  required
                  value={routeValue}
                  onChange={(e) => setRouteValue(e.target.value)}
                  className={inputCls}
                  placeholder={applicationMode === "EMPLOYER_EMAIL" ? "careers@employer.zm" : "https://"}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="label-mono">Source link for verification</span>
                <input
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={inputCls}
                  placeholder="https://"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="label-mono">Summary</span>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="label-mono">Requirements (one per line)</span>
                <textarea
                  rows={4}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className={inputCls}
                />
              </label>
              {submitMutation.isError ? (
                <p className="text-xs text-rose-400 sm:col-span-2">
                  {submitMutation.error instanceof ApiError
                    ? submitMutation.error.message
                    : "Something went wrong. Please try again."}
                </p>
              ) : null}
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <button
                  disabled={submitMutation.isPending}
                  className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                >
                  {submitMutation.isPending ? "Submitting…" : "Submit for review"}
                </button>
              </div>
            </form>
          </Panel>
        </div>
        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            <div className="label-mono mb-2">Review checklist</div>
            <ul className="space-y-2 text-sm text-muted">
              <li>— Organisation must be registered and reachable.</li>
              <li>— Source link must show the same role and deadline.</li>
              <li>— Application method must belong to the employer.</li>
              <li>— No application fees may be charged to candidates.</li>
            </ul>
          </Panel>
          <Panel>
            <p className="text-xs text-muted">{ORG.disclaimer}</p>
          </Panel>
        </aside>
      </section>
    </SiteShell>
  );
}
