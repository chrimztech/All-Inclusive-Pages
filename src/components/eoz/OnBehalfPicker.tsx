import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Search, X } from "lucide-react";
import { Chip, Panel } from "@/components/eoz/SiteShell";
import { api } from "@/lib/api-client";

export type PostableOrganisation = {
  id: string;
  legalName: string;
  tradingName: string | null;
  verificationStatus: string;
};

export type OnBehalfChoice =
  { kind: "registered"; organisation: PostableOrganisation } | { kind: "unregistered" } | null;

const displayName = (o: PostableOrganisation) => o.tradingName || o.legalName;

/**
 * For EOZ staff posting a listing on an organisation's behalf: search registered organisations (so the listing is
 * linked to their profile and their team can manage it), or choose "not registered on EOZ" and type the name.
 */
export function OnBehalfPicker({
  value,
  onChange,
}: {
  value: OnBehalfChoice;
  onChange: (choice: OnBehalfChoice) => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);
  const results = useQuery({
    queryKey: ["post-for", "organisations", debounced],
    queryFn: () =>
      api.get<PostableOrganisation[]>("/opportunities/post-for/organisations", { q: debounced }),
    enabled: value === null,
    retry: false,
  });

  return (
    <Panel className="mb-6 p-6">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
        <Building2 aria-hidden="true" className="size-4 text-accent-soft" />
        Posting on behalf of
      </div>
      <p className="mb-4 text-xs text-muted">
        Choose the organisation this listing belongs to. A registered organisation is linked to the
        listing, told about it, and can see and edit it under My listings.
      </p>

      {value?.kind === "registered" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-accent/30">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{displayName(value.organisation)}</div>
            {value.organisation.tradingName ? (
              <div className="truncate text-xs text-muted">{value.organisation.legalName}</div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Chip tone={value.organisation.verificationStatus === "VERIFIED" ? "emerald" : "amber"}>
              {value.organisation.verificationStatus.replace(/_/g, " ")}
            </Chip>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
            >
              <X aria-hidden="true" className="size-3" />
              Change
            </button>
          </div>
        </div>
      ) : value?.kind === "unregistered" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm ring-1 ring-line">
          <span>Not registered on EOZ — type the organisation's name in the form below.</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md px-2 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
          >
            Search registered organisations
          </button>
        </div>
      ) : (
        <>
          <label className="relative block">
            <span className="sr-only">Search organisations</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by legal or trading name"
              className="w-full rounded-md bg-surface-2 py-2 pl-9 pr-3 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
            />
          </label>
          <ul
            className="mt-2 max-h-64 divide-y divide-line overflow-y-auto"
            aria-label="Organisations"
          >
            {(results.data ?? []).map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onChange({ kind: "registered", organisation: o })}
                  className="flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left text-sm hover:bg-white/[0.04]"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{displayName(o)}</span>
                    {o.tradingName ? (
                      <span className="block truncate text-xs text-muted">{o.legalName}</span>
                    ) : null}
                  </span>
                  <Chip tone={o.verificationStatus === "VERIFIED" ? "emerald" : "amber"}>
                    {o.verificationStatus.replace(/_/g, " ")}
                  </Chip>
                </button>
              </li>
            ))}
          </ul>
          {results.isSuccess && (results.data ?? []).length === 0 ? (
            <p className="mt-2 text-xs text-muted">No registered organisation matches.</p>
          ) : null}
          <button
            type="button"
            onClick={() => onChange({ kind: "unregistered" })}
            className="mt-3 text-xs text-accent-soft hover:text-fg"
          >
            The organisation isn't registered on EOZ →
          </button>
        </>
      )}
    </Panel>
  );
}
