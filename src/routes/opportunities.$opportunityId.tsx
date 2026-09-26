import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  MapPin,
  Share2,
} from "lucide-react";
import { FacebookIcon, LinkedInIcon, WhatsAppIcon } from "@/components/eoz/SocialIcons";
import { SiteShell, Panel, Chip } from "@/components/eoz/SiteShell";
import { ORG } from "@/lib/eoz-data";
import { DeadlineChip, SaveToggle } from "@/components/eoz/OpportunityCard";
import { useCurrentUser } from "@/lib/use-current-user";
import { safeHttpUrl } from "@/lib/safe-url";
import {
  api,
  ApiError,
  EMPLOYMENT_TYPE_LABELS,
  WORK_ARRANGEMENT_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  type ApiOpportunityDetail,
  type PageResponse,
  type ApiOpportunitySummary,
} from "@/lib/api-client";

function salaryRangeLabel(item: ApiOpportunityDetail): string | null {
  if (item.salaryMin == null && item.salaryMax == null) return null;
  const currency = item.currency ?? "ZMW";
  if (item.salaryMin != null && item.salaryMax != null) {
    return `${currency} ${item.salaryMin.toLocaleString()} – ${item.salaryMax.toLocaleString()}`;
  }
  const value = item.salaryMin ?? item.salaryMax;
  return `${currency} ${value?.toLocaleString()}`;
}

export const Route = createFileRoute("/opportunities/$opportunityId")({
  loader: async ({ params }) => {
    try {
      const item = await api.get<ApiOpportunityDetail>(`/opportunities/${params.opportunityId}`);
      return { item };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw notFound();
      }
      throw error;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Opportunity unavailable — Echo Opportunities Zambia" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { item } = loaderData;
    const title = `${item.title} — ${item.organisationName} | EOZ`;
    return {
      meta: [
        { title },
        { name: "description", content: item.description },
        { property: "og:title", content: title },
        { property: "og:description", content: item.description },
      ],
    };
  },
  component: Detail,
  notFoundComponent: OpportunityNotFound,
});

function OpportunityNotFound() {
  return (
    <SiteShell>
      <div className="py-24 text-center">
        <h1 className="font-display text-4xl tracking-tight">Listing unavailable</h1>
        <p className="mt-3 text-muted">This opportunity may have closed or been removed.</p>
        <Link to="/opportunities" className="mt-6 inline-block text-sm text-accent-soft">
          Back to the board →
        </Link>
      </div>
    </SiteShell>
  );
}

function trackApplyClick(id: string) {
  api.post(`/opportunities/${id}/apply-click`).catch(() => undefined);
}

function isEozHiring(item: ApiOpportunityDetail) {
  return (
    item.applicationMode === "EOZ_INTERNAL_HIRING" ||
    /^echo opportunities zambia$/i.test(item.organisationName.trim())
  );
}

function applyMethodLabel(item: ApiOpportunityDetail) {
  switch (item.applicationMode) {
    case "EXTERNAL_URL":
      return `Employer's own application portal — ${item.applicationUrl}`;
    case "EMPLOYER_EMAIL":
      return `Email the employer directly — ${item.applicationEmail}`;
    case "PHYSICAL_ADDRESS":
      return item.applicationAddress ?? "Physical submission per the listing instructions.";
    case "EOZ_HOSTED":
      return "Apply directly through EOZ using the form below.";
    case "EOZ_INTERNAL_HIRING":
      return "This is an EOZ-managed hiring process.";
    default:
      return "Information only — no application route is currently open.";
  }
}

function Detail() {
  const { item } = Route.useLoaderData();
  const { user } = useCurrentUser();
  const isCandidate = user?.roles.includes("CANDIDATE") ?? false;

  const relatedQuery = useQuery({
    queryKey: ["opportunities", "related", item.categoryCode],
    queryFn: () =>
      api.get<PageResponse<ApiOpportunitySummary>>("/opportunities", {
        category: item.categoryCode,
        size: 4,
      }),
  });
  const related = (relatedQuery.data?.items ?? []).filter((o) => o.id !== item.id).slice(0, 3);

  return (
    <SiteShell>
      <section className="grid gap-8 py-10 lg:grid-cols-12 lg:py-14">
        <div className="lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Chip>{item.categoryName.replace(/s$/, "")}</Chip>
            {item.verified ? (
              <Chip tone="emerald">Verified source</Chip>
            ) : (
              <Chip tone="rose">Unverified</Chip>
            )}
            <DeadlineChip deadline={item.deadline} intervalMs={1000} />
            {item.employmentType ? (
              <Chip tone="muted">{EMPLOYMENT_TYPE_LABELS[item.employmentType]}</Chip>
            ) : null}
            {item.workArrangement ? (
              <Chip tone="muted">{WORK_ARRANGEMENT_LABELS[item.workArrangement]}</Chip>
            ) : null}
            {item.experienceLevel ? (
              <Chip tone="muted">{EXPERIENCE_LEVEL_LABELS[item.experienceLevel]}</Chip>
            ) : null}
            <span className="label-mono">Ref {item.reference}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-balance font-display text-4xl leading-[1.05] tracking-tight lg:text-5xl">
              {item.title}
            </h1>
            {isCandidate ? (
              <SaveToggle opportunityId={item.id} className="relative shrink-0" />
            ) : null}
          </div>
          <p className="mt-3 text-muted">
            {item.organisationName}
            {item.region ? ` · ${item.region}` : ""}
            {item.workMode ? ` · ${item.workMode}` : ""}
          </p>
          <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs text-muted ring-1 ring-line">
            <Building2 aria-hidden="true" className="size-3.5 text-accent-soft" />
            {isEozHiring(item) ? (
              <span>Hiring organisation: Echo Opportunities Zambia</span>
            ) : (
              <span>
                Published by EOZ on behalf of{" "}
                <span className="font-medium text-fg">{item.organisationName}</span>
              </span>
            )}
            {item.organisationId ? (
              <Link
                to="/organisations/$organisationId"
                params={{ organisationId: item.organisationId }}
                className="text-accent-soft hover:text-fg"
              >
                View profile →
              </Link>
            ) : null}
          </p>

          <p className="mt-8 max-w-[62ch] text-pretty text-lg text-muted">{item.description}</p>

          {item.requirements ? (
            <>
              <h2 className="mt-10 font-display text-2xl tracking-tight">Requirements</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {item.requirements.split(";").map((r) => (
                  <li key={r} className="flex gap-3">
                    <span className="text-accent-soft">—</span>
                    <span>{r.trim()}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mt-10 font-display text-2xl tracking-tight">How to apply</h2>
          <Panel className="mt-4">
            <div className="label-mono mb-2">Official application route</div>
            <ApplyRoute item={item} />
            <p className="mt-4 text-xs text-muted">{ORG.disclaimer}</p>
            {item.applicationMode === "EOZ_HOSTED" ? (
              <EozHostedApplyForm opportunityId={item.id} />
            ) : null}
          </Panel>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <Panel>
            {item.opportunityValue ? (
              <>
                <div className="label-mono">Value</div>
                <div className="font-display text-3xl">{item.opportunityValue}</div>
                <div className="text-xs text-muted">{item.opportunityValueUnit}</div>
              </>
            ) : (
              <div className="label-mono">At a glance</div>
            )}
            {salaryRangeLabel(item) ? (
              <div className="mt-1 text-xs text-accent-soft">{salaryRangeLabel(item)}</div>
            ) : null}
            <div className="mt-5 space-y-2 text-sm">
              <Row label="Organisation" value={item.organisationName} />
              <Row label="Region" value={item.region ?? "—"} />
              <Row label="Mode" value={item.workMode ?? "—"} />
              <Row
                label="Employment"
                value={item.employmentType ? EMPLOYMENT_TYPE_LABELS[item.employmentType] : "—"}
              />
              <Row
                label="Experience"
                value={item.experienceLevel ? EXPERIENCE_LEVEL_LABELS[item.experienceLevel] : "—"}
              />
              <Row label="Source" value={item.source ?? "—"} />
              <Row label="Reference" value={item.reference} />
            </div>
          </Panel>
          <ShareBar item={item} />
          <Panel>
            <div className="label-mono mb-2">EOZ support &amp; services</div>
            <p className="text-sm text-muted">
              CV writing, cover letters and interview coaching from the EOZ services desk.
            </p>
            <p className="mt-2 text-xs text-muted">
              The services desk is not the application channel for this opportunity — apply only
              through the official route above.
            </p>
            <Link to="/services" className="mt-3 inline-block text-sm text-accent-soft">
              View services →
            </Link>
          </Panel>
        </aside>
      </section>

      {related.length ? (
        <section className="pb-14">
          <h2 className="mb-4 font-display text-2xl tracking-tight">Similar opportunities</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {related.map((o) => (
              <RelatedCard key={o.id} item={o} />
            ))}
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}

/** The employer's own application route, rendered as the right kind of action. */
function ApplyRoute({ item }: { item: ApiOpportunityDetail }) {
  const [copied, setCopied] = useState(false);
  const closed = item.deadline != null && new Date(item.deadline).getTime() < Date.now();

  if (closed) {
    return (
      <p className="text-sm text-muted">
        This opportunity closed on {new Date(item.deadline!).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" })}{" "}
        (Lusaka time). New applications are no longer accepted.
      </p>
    );
  }

  if (item.applicationMode === "EXTERNAL_URL") {
    const url = safeHttpUrl(item.applicationUrl);
    if (!url) {
      return <p className="text-sm text-rose">The application link for this listing is invalid. Please report it.</p>;
    }
    return (
      <div>
        <a
          href={url.toString()}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={() => trackApplyClick(item.id)}
          className="btn-primary px-5 py-3 text-sm"
        >
          Apply on the employer's site
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
        <p className="mt-2 text-xs text-muted">
          External link — opens <span className="font-mono text-fg/80">{url.hostname}</span> in a new tab.
        </p>
      </div>
    );
  }

  if (item.applicationMode === "EMPLOYER_EMAIL" && item.applicationEmail) {
    const subject = encodeURIComponent(`Application: ${item.title} (${item.reference})`);
    return (
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`mailto:${item.applicationEmail}?subject=${subject}`}
          onClick={() => trackApplyClick(item.id)}
          className="btn-primary px-5 py-3 text-sm"
        >
          <Mail aria-hidden="true" className="size-4" />
          Email your application
        </a>
        <span className="font-mono text-sm text-fg/80">{item.applicationEmail}</span>
      </div>
    );
  }

  if (item.applicationMode === "PHYSICAL_ADDRESS" && item.applicationAddress) {
    return (
      <div className="flex flex-wrap items-start gap-3">
        <p className="flex items-start gap-2 text-sm">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-soft" />
          {item.applicationAddress}
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(item.applicationAddress ?? "").then(() => {
              setCopied(true);
              trackApplyClick(item.id);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
          {copied ? "Copied" : "Copy address"}
        </button>
      </div>
    );
  }

  return <p className="text-sm">{applyMethodLabel(item)}</p>;
}

function ShareBar({ item }: { item: ApiOpportunityDetail }) {
  const [copied, setCopied] = useState(false);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const text = `${item.title} — ${item.organisationName}`;
  const record = () => api.post(`/opportunities/${item.id}/share`).catch(() => undefined);
  const targets = [
    {
      label: "WhatsApp",
      Icon: WhatsAppIcon,
      href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl}`)}`,
    },
    {
      label: "Facebook",
      Icon: FacebookIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    },
    {
      label: "LinkedIn",
      Icon: LinkedInIcon,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    },
  ];

  return (
    <Panel>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Share2 aria-hidden="true" className="size-4 text-accent-soft" />
        Share this opportunity
      </div>
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <a
            key={t.label}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={record}
            aria-label={`Share on ${t.label}`}
            title={`Share on ${t.label}`}
            className="flex size-10 items-center justify-center rounded-xl bg-white/[0.04] text-accent-soft ring-1 ring-line transition-all hover:-translate-y-0.5 hover:text-fg hover:ring-accent/40"
          >
            <t.Icon className="size-4" />
          </a>
        ))}
        <button
          type="button"
          onClick={() => {
            const nav = typeof navigator !== "undefined" ? navigator : undefined;
            if (nav?.share) {
              nav.share({ title: text, url: pageUrl }).then(record, () => undefined);
              return;
            }
            nav?.clipboard?.writeText(pageUrl).then(() => {
              record();
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="btn-secondary h-10 px-3 text-xs"
        >
          {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Link2 aria-hidden="true" className="size-3.5" />}
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </Panel>
  );
}

function RelatedCard({ item }: { item: ApiOpportunitySummary }) {
  return (
    <Link
      to="/opportunities/$opportunityId"
      params={{ opportunityId: item.slug }}
      className="glass rounded-xl p-4 ring-1 ring-line transition-colors hover:ring-accent/40"
    >
      <div className="label-mono">{item.organisationName}</div>
      <div className="mt-1 font-display text-lg tracking-tight">{item.title}</div>
      <div className="mt-2">
        <DeadlineChip deadline={item.deadline} />
      </div>
    </Link>
  );
}

function EozHostedApplyForm({ opportunityId }: { opportunityId: string }) {
  const { user, isLoading } = useCurrentUser();
  const [coverNote, setCoverNote] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post(`/opportunities/${opportunityId}/applications`, { coverNote }),
  });

  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className="mt-4 rounded-md bg-surface-2 p-4 ring-1 ring-line">
        <p className="text-sm">Sign in or create a free account to apply.</p>
        <p className="mt-1 text-xs text-muted">
          Your profile and CV carry over to every application, so employers can screen you properly.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            to="/auth"
            search={{ mode: "signup", redirect: `/opportunities/${opportunityId}` }}
            className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink"
          >
            Create account
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin", redirect: `/opportunities/${opportunityId}` }}
            className="rounded-md px-4 py-2 text-sm text-muted ring-1 ring-line hover:text-fg"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!user.roles.includes("CANDIDATE")) {
    return (
      <p className="mt-4 text-sm text-muted">
        Sign in with a candidate account to apply to this opportunity.
      </p>
    );
  }

  if (mutation.isSuccess) {
    return (
      <p className="mt-4 text-sm text-emerald-400">
        Application submitted — track it from your dashboard.
      </p>
    );
  }

  return (
    <form
      className="mt-4 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <textarea
        value={coverNote}
        onChange={(e) => setCoverNote(e.target.value)}
        placeholder="Optional note to the hiring team"
        rows={3}
        className="w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line"
      />
      <p className="text-xs text-muted">
        The CV on your{" "}
        <Link to="/candidate/profile" className="text-accent-soft hover:text-fg">
          profile
        </Link>{" "}
        will be attached automatically.
      </p>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="accent-gradient w-fit rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
      >
        {mutation.isPending ? "Submitting…" : "Apply through EOZ"}
      </button>
      {mutation.isError ? (
        <p className="text-xs text-rose-400">
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : "Something went wrong. Please try again."}
        </p>
      ) : null}
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-line pt-2">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
