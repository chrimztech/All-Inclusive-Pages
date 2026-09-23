import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe2, MapPin, ShieldCheck } from "lucide-react";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { useCountdown, formatCountdown } from "@/lib/use-countdown";
import {
  api,
  organisationLogoUrl,
  BUSINESS_TYPE_LABELS,
  SIZE_BAND_LABELS,
  type ApiOpportunitySummary,
  type ApiOrganisation,
  type PageResponse,
} from "@/lib/api-client";

export const Route = createFileRoute("/organisations/$organisationId")({
  head: () => ({
    meta: [
      { title: "Organisation profile - EOZ" },
      { name: "description", content: "Public organisation profile on EOZ." },
    ],
  }),
  component: OrganisationProfile,
});

function OrganisationProfile() {
  const { organisationId } = Route.useParams();

  const orgQuery = useQuery({
    queryKey: ["organisation", organisationId],
    queryFn: () => api.get<ApiOrganisation>(`/organisations/${organisationId}`),
  });

  const listingsQuery = useQuery({
    queryKey: ["organisation-listings", organisationId],
    queryFn: () =>
      api.get<PageResponse<ApiOpportunitySummary>>("/opportunities", {
        organisationId,
        size: 20,
      }),
    enabled: !!orgQuery.data,
  });

  if (orgQuery.isLoading) {
    return (
      <SiteShell>
        <PageIntro eyebrow="Public organisation profile" title="Loading…" lead="" />
      </SiteShell>
    );
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <SiteShell>
        <PageIntro
          eyebrow="Public organisation profile"
          title="Organisation not found"
          lead="This organisation profile is unavailable or has been removed."
        />
      </SiteShell>
    );
  }

  const profile = orgQuery.data;
  const name = profile.tradingName ?? profile.legalName;
  const verified = profile.verificationStatus === "VERIFIED";
  const listings = listingsQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="Public organisation profile"
        title={
          <span className="flex items-center gap-4">
            {profile.logoFileId ? (
              <img
                src={organisationLogoUrl(profile.id)}
                alt=""
                className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-line"
              />
            ) : null}
            {name}
          </span>
        }
        lead={profile.description ?? "This organisation has not added a public description yet."}
        aside={
          <Panel>
            <Chip tone={verified ? "emerald" : "amber"}>
              {verified ? "EOZ verified" : "New business — unverified"}
            </Chip>
            {profile.businessType ? (
              <Chip tone="muted">{BUSINESS_TYPE_LABELS[profile.businessType]}</Chip>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-muted">
              {verified
                ? "Verification confirms submitted organisation evidence. It does not guarantee a hiring outcome."
                : "This organisation is still going through EOZ's verification review. Small and new businesses can post opportunities while this is pending."}
            </p>
          </Panel>
        }
      />
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <Panel>
              <MapPin aria-hidden="true" className="size-4 text-accent-soft" />
              <div className="mt-3 label-mono">Location</div>
              <div className="mt-1 text-sm">{profile.address ?? "Not listed"}</div>
            </Panel>
            <Panel>
              <Globe2 aria-hidden="true" className="size-4 text-accent-soft" />
              <div className="mt-3 label-mono">Website</div>
              <div className="mt-1 text-sm">{profile.website ?? "Not listed"}</div>
            </Panel>
            <Panel>
              <ShieldCheck aria-hidden="true" className="size-4 text-accent-soft" />
              <div className="mt-3 label-mono">Sector</div>
              <div className="mt-1 text-sm">{profile.sector ?? "Not listed"}</div>
            </Panel>
            {profile.sizeBand ? (
              <Panel>
                <div className="label-mono">Team size</div>
                <div className="mt-1 text-sm">{SIZE_BAND_LABELS[profile.sizeBand]}</div>
              </Panel>
            ) : null}
            {profile.foundedYear ? (
              <Panel>
                <div className="label-mono">Founded</div>
                <div className="mt-1 text-sm">{profile.foundedYear}</div>
              </Panel>
            ) : null}
          </div>
          <Panel>
            <div className="label-mono mb-4">Active opportunities</div>
            {listingsQuery.isLoading ? (
              <p className="text-sm text-muted">Loading listings…</p>
            ) : listings.length ? (
              listings.map((listing) => <OrgListingRow key={listing.id} listing={listing} />)
            ) : (
              <p className="text-sm text-muted">
                No active EOZ listings from this organisation right now.
              </p>
            )}
          </Panel>
        </div>
        <Panel className="lg:col-span-4">
          <div className="label-mono">Before you apply</div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <li>Confirm the listing is still active.</li>
            <li>Use only the application method shown on the opportunity.</li>
            <li>Never pay for an interview or job offer.</li>
          </ul>
          <Link to="/scam-warning" className="mt-5 inline-block text-sm text-accent-soft">
            Read the scam warning →
          </Link>
        </Panel>
      </section>
    </SiteShell>
  );
}

function OrgListingRow({ listing }: { listing: ApiOpportunitySummary }) {
  const countdown = useCountdown(listing.deadline);
  return (
    <Link
      to="/opportunities/$opportunityId"
      params={{ opportunityId: listing.slug }}
      className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-4 first:border-0 first:pt-0"
    >
      <span>
        <span className="block text-sm">{listing.title}</span>
        <span className="text-xs text-muted">
          {listing.categoryName} · {listing.region ?? "National"}
        </span>
      </span>
      <span className="font-mono text-xs text-accent-soft">{formatCountdown(countdown)} →</span>
    </Link>
  );
}
