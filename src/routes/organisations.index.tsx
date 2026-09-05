import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, MapPin, Search } from "lucide-react";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

export const Route = createFileRoute("/organisations/")({
  head: () => ({
    meta: [
      { title: "Verified Organisations - Echo Opportunities Zambia" },
      {
        name: "description",
        content: "Explore public profiles for organisations sharing opportunities through EOZ.",
      },
    ],
  }),
  component: OrganisationDirectory,
});

const PROFILES = [
  {
    id: "mfumu-analytics",
    name: "Mfumu Analytics",
    sector: "Technology & professional services",
    location: "Lusaka",
    listings: 12,
    verified: true,
  },
  {
    id: "zambezi-build",
    name: "Zambezi Build Co.",
    sector: "Construction & engineering",
    location: "Copperbelt",
    listings: 7,
    verified: true,
  },
  {
    id: "kalulu-trust",
    name: "Kalulu Development Trust",
    sector: "Non-profit & development",
    location: "Central",
    listings: 9,
    verified: true,
  },
  {
    id: "chobe-foundation",
    name: "Chobe Foundation",
    sector: "Enterprise development",
    location: "National",
    listings: 3,
    verified: false,
  },
  {
    id: "lusaka-skills",
    name: "Lusaka Skills Institute",
    sector: "Education & training",
    location: "Lusaka",
    listings: 5,
    verified: true,
  },
  {
    id: "zambezi-bank",
    name: "Zambezi Commercial Bank",
    sector: "Banking & finance",
    location: "National",
    listings: 4,
    verified: true,
  },
];

function OrganisationDirectory() {
  const [query, setQuery] = useState("");
  const visible = PROFILES.filter((profile) =>
    `${profile.name} ${profile.sector} ${profile.location}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <SiteShell>
      <PageIntro
        eyebrow="Organisation directory"
        title="Know who is behind the opportunity."
        lead="Review public organisation profiles, verification status and active EOZ listings before you apply."
      />
      <label className="relative mb-6 block max-w-xl">
        <span className="sr-only">Search organisations</span>
        <Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, sector or location"
          className="w-full rounded-md bg-surface-2 py-2.5 pl-10 pr-3 text-sm outline-none ring-1 ring-line focus:ring-accent/50"
        />
      </label>
      <section className="grid gap-4 pb-14 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((profile) => (
          <Panel key={profile.id} className="flex min-h-56 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent-soft ring-1 ring-accent/25">
                <Building2 aria-hidden="true" className="size-5" />
              </div>
              <Chip tone={profile.verified ? "emerald" : "amber"}>
                {profile.verified ? "Verified" : "Under review"}
              </Chip>
            </div>
            <h2 className="mt-5 font-display text-2xl tracking-tight">{profile.name}</h2>
            <p className="mt-1 text-sm text-muted">{profile.sector}</p>
            <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
              <span className="flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3" />
                {profile.location}
              </span>
              <span>{profile.listings} listings</span>
            </div>
            <Link
              to="/organisations/$organisationId"
              params={{ organisationId: profile.id }}
              className="mt-4 text-sm text-accent-soft"
            >
              View profile →
            </Link>
          </Panel>
        ))}
        {!visible.length ? (
          <Panel className="md:col-span-2 lg:col-span-3 py-12 text-center text-sm text-muted">
            No organisations match that search.
          </Panel>
        ) : null}
      </section>
    </SiteShell>
  );
}
