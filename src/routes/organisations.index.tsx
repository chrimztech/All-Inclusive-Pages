import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Search } from "lucide-react";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import {
  api,
  organisationLogoUrl,
  type ApiOrganisation,
  type PageResponse,
} from "@/lib/api-client";

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

function OrganisationDirectory() {
  const [query, setQuery] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["organisations"],
    queryFn: () => api.get<PageResponse<ApiOrganisation>>("/organisations", { size: 60 }),
  });

  const profiles = data?.items ?? [];
  const visible = profiles.filter((profile) =>
    `${profile.tradingName ?? profile.legalName} ${profile.sector ?? ""} ${profile.address ?? ""}`
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
        {isLoading ? (
          <Panel className="md:col-span-2 lg:col-span-3 py-12 text-center text-sm text-muted">
            Loading organisations…
          </Panel>
        ) : isError ? (
          <Panel className="md:col-span-2 lg:col-span-3 py-12 text-center text-sm text-muted">
            Could not load organisations right now. Please try again shortly.
          </Panel>
        ) : (
          visible.map((profile) => {
            const verified = profile.verificationStatus === "VERIFIED";
            const name = profile.tradingName ?? profile.legalName;
            return (
              <Panel key={profile.id} className="flex min-h-56 flex-col">
                <div className="flex items-start justify-between gap-3">
                  {profile.logoFileId ? (
                    <img
                      src={organisationLogoUrl(profile.id)}
                      alt=""
                      className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-line"
                    />
                  ) : (
                    <div className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent-soft ring-1 ring-accent/25">
                      <Building2 aria-hidden="true" className="size-5" />
                    </div>
                  )}
                  <Chip tone={verified ? "emerald" : "amber"}>
                    {verified ? "Verified" : "Under review"}
                  </Chip>
                </div>
                <h2 className="mt-5 font-display text-2xl tracking-tight">{name}</h2>
                <p className="mt-1 text-sm text-muted">{profile.sector ?? "Sector not listed"}</p>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3" />
                    {profile.address ?? "Location not listed"}
                  </span>
                  <span>{profile.listingsCount} listings</span>
                </div>
                <Link
                  to="/organisations/$organisationId"
                  params={{ organisationId: profile.id }}
                  className="mt-4 text-sm text-accent-soft"
                >
                  View profile →
                </Link>
              </Panel>
            );
          })
        )}
        {!isLoading && !isError && !visible.length ? (
          <Panel className="md:col-span-2 lg:col-span-3 py-12 text-center text-sm text-muted">
            No organisations match that search.
          </Panel>
        ) : null}
      </section>
    </SiteShell>
  );
}
