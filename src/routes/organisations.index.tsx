import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Award, BadgeCheck, Building2, MapPin, Search } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<"top" | "newest" | "name">("top");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Search runs on the server, a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["organisations", "directory", order, verifiedOnly, search],
    queryFn: () =>
      api.get<PageResponse<ApiOrganisation>>("/organisations", {
        order,
        verifiedOnly: verifiedOnly ? "true" : undefined,
        q: search || undefined,
        size: 60,
      }),
    placeholderData: keepPreviousData,
  });

  const visible = data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="Organisation directory"
        title="Know who is behind the opportunity."
        lead="Review public organisation profiles, verification status and active EOZ listings before you apply."
      />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-xl">
          <span className="sr-only">Search organisations</span>
          <Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, sector or location"
            className="w-full rounded-xl bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm outline-none ring-1 ring-line focus:ring-accent/50"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Order organisations"
            className="inline-flex rounded-xl bg-white/[0.03] p-1 text-xs ring-1 ring-line"
          >
            {(
              [
                { v: "top", l: "Top recruiters" },
                { v: "newest", l: "Newest" },
                { v: "name", l: "A–Z" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                aria-pressed={order === o.v}
                onClick={() => setOrder(o.v)}
                className={`rounded-lg px-3 py-1.5 transition-colors ${order === o.v ? "bg-white/[0.09] text-fg" : "text-muted hover:text-fg"}`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={verifiedOnly}
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs ring-1 transition-colors ${
              verifiedOnly
                ? "bg-emerald/10 text-emerald ring-emerald/30"
                : "text-muted ring-line hover:text-fg"
            }`}
          >
            <BadgeCheck aria-hidden="true" className="size-3.5" />
            Verified only
          </button>
        </div>
      </div>
      <section
        aria-busy={isFetching}
        className={`grid gap-4 pb-14 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${isFetching && !isLoading ? "opacity-70" : ""}`}
      >
        {isLoading ? (
          <Panel className="md:col-span-2 lg:col-span-3 py-12 text-center text-sm text-muted">
            Loading organisations…
          </Panel>
        ) : isError ? (
          <Panel className="md:col-span-2 lg:col-span-3 py-12 text-center text-sm text-muted">
            Could not load organisations right now. Please try again shortly.
          </Panel>
        ) : (
          visible.map((profile, index) => {
            const rank =
              order === "top" && profile.listingsCount > 0 && index < 3 ? index + 1 : null;
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
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {rank ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber/15 px-2 py-0.5 font-mono text-[10px] text-amber ring-1 ring-inset ring-amber/30">
                        <Award aria-hidden="true" className="size-3" />
                        Top recruiter #{rank}
                      </span>
                    ) : null}
                    <Chip tone={verified ? "emerald" : "amber"}>
                      {verified ? "Verified" : "Under review"}
                    </Chip>
                  </div>
                </div>
                <h2 className="mt-5 font-display text-2xl tracking-tight">{name}</h2>
                <p className="mt-1 text-sm text-muted">{profile.sector ?? "Sector not listed"}</p>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3" />
                    {profile.address ?? "Location not listed"}
                  </span>
                  <span>
                    {profile.listingsCount} live{" "}
                    {profile.listingsCount === 1 ? "listing" : "listings"}
                  </span>
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
            {search || verifiedOnly
              ? "No organisations match these filters."
              : "No organisations yet."}
          </Panel>
        ) : null}
      </section>
    </SiteShell>
  );
}
