import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Globe2, MapPin, ShieldCheck } from "lucide-react";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { OPPORTUNITIES } from "@/lib/eoz-data";

const PROFILES = {
  "mfumu-analytics": {
    name: "Mfumu Analytics",
    sector: "Technology & professional services",
    location: "Lusaka",
    website: "mfumu-analytics.zm",
    about:
      "A fictional Zambian consultancy helping organisations turn operational data into practical decisions.",
    verified: true,
  },
  "zambezi-build": {
    name: "Zambezi Build Co.",
    sector: "Construction & engineering",
    location: "Copperbelt",
    website: "zambezibuild.co.zm",
    about:
      "A fictional civil works company delivering commercial and public infrastructure projects across Zambia.",
    verified: true,
  },
  "kalulu-trust": {
    name: "Kalulu Development Trust",
    sector: "Non-profit & development",
    location: "Central",
    website: "kalulutrust.org",
    about:
      "A fictional development organisation focused on youth livelihoods, community resilience and local partnerships.",
    verified: true,
  },
  "chobe-foundation": {
    name: "Chobe Foundation",
    sector: "Enterprise development",
    location: "National",
    website: "chobefoundation.org",
    about:
      "A fictional foundation supporting early-stage enterprises through grants, mentoring and market connections.",
    verified: false,
  },
  "lusaka-skills": {
    name: "Lusaka Skills Institute",
    sector: "Education & training",
    location: "Lusaka",
    website: "lusakaskills.zm",
    about: "A fictional practical training provider for digital, technical and workplace skills.",
    verified: true,
  },
  "zambezi-bank": {
    name: "Zambezi Commercial Bank",
    sector: "Banking & finance",
    location: "National",
    website: "zcb.co.zm",
    about:
      "A fictional financial institution serving individuals and growing businesses across Zambia.",
    verified: true,
  },
} as const;

export const Route = createFileRoute("/organisations/$organisationId")({
  loader: ({ params }) => {
    const profile = PROFILES[params.organisationId as keyof typeof PROFILES];
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Organisation"} - EOZ` },
      { name: "description", content: loaderData?.about ?? "Public organisation profile on EOZ." },
    ],
  }),
  component: OrganisationProfile,
});

function OrganisationProfile() {
  const profile = Route.useLoaderData();
  const listings = OPPORTUNITIES.filter((item) => item.organisation === profile.name);
  return (
    <SiteShell>
      <PageIntro
        eyebrow="Public organisation profile"
        title={profile.name}
        lead={profile.about}
        aside={
          <Panel>
            <Chip tone={profile.verified ? "emerald" : "amber"}>
              {profile.verified ? "EOZ verified" : "Verification in progress"}
            </Chip>
            <p className="mt-3 text-xs leading-5 text-muted">
              Verification confirms submitted organisation evidence. It does not guarantee a hiring
              outcome.
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
              <div className="mt-1 text-sm">{profile.location}</div>
            </Panel>
            <Panel>
              <Globe2 aria-hidden="true" className="size-4 text-accent-soft" />
              <div className="mt-3 label-mono">Website</div>
              <div className="mt-1 text-sm">{profile.website}</div>
            </Panel>
            <Panel>
              <ShieldCheck aria-hidden="true" className="size-4 text-accent-soft" />
              <div className="mt-3 label-mono">Sector</div>
              <div className="mt-1 text-sm">{profile.sector}</div>
            </Panel>
          </div>
          <Panel>
            <div className="label-mono mb-4">Active opportunities</div>
            {listings.length ? (
              listings.map((listing) => (
                <Link
                  key={listing.id}
                  to="/opportunities/$opportunityId"
                  params={{ opportunityId: listing.id }}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-4 first:border-0 first:pt-0"
                >
                  <span>
                    <span className="block text-sm">{listing.title}</span>
                    <span className="text-xs text-muted">
                      {listing.category} · {listing.region}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-accent-soft">
                    Closes in {listing.closesInDays} days →
                  </span>
                </Link>
              ))
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
