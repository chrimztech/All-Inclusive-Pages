import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { api, isUnauthenticated, ApiError } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/employers/organisation")({
  head: () => ({ meta: [{ title: "Organisation Profile — EOZ Employers" }] }),
  component: Organisation,
});

type ApiOrganisation = {
  id: string;
  legalName: string;
  tradingName: string | null;
  sector: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  verificationStatus: string;
  listingsCount: number;
};

function Organisation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orgsQuery = useQuery({
    queryKey: ["employer", "organisations", "mine"],
    queryFn: () => api.get<ApiOrganisation[]>("/organisations/mine"),
    retry: false,
  });
  const org = orgsQuery.data?.[0];

  const [legalName, setLegalName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (org) {
      setLegalName(org.legalName);
      setTradingName(org.tradingName ?? "");
      setSector(org.sector ?? "");
      setWebsite(org.website ?? "");
      setAddress(org.address ?? "");
      setDescription(org.description ?? "");
    }
  }, [org]);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/organisations/${org?.id}`, {
        legalName,
        tradingName: tradingName || undefined,
        sector: sector || undefined,
        website: website || undefined,
        address: address || undefined,
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "organisations", "mine"] });
      toast("Profile updated.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save changes.", "error"),
  });

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.4 ) — Organisation"
        title="Build trust before the listing."
        lead="A complete, verified organisation profile gives candidates the context they need and helps EOZ moderate your opportunities faster."
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(orgsQuery.error) ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted">Sign in as an employer to manage your organisation.</p>
        </Panel>
      ) : null}

      {orgsQuery.isLoading ? (
        <Panel className="py-10 text-center text-sm text-muted">Loading…</Panel>
      ) : !org ? (
        <Panel className="py-10 text-center text-sm text-muted">
          You have not registered an organisation yet.
        </Panel>
      ) : (
        <section className="grid gap-6 pb-14 lg:grid-cols-12">
          <Panel className="lg:col-span-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="label-mono">Public profile</div>
                <h2 className="mt-1 font-display text-2xl">{org.tradingName ?? org.legalName}</h2>
                <p className="mt-1 text-sm text-muted">{org.sector ?? "Sector not set"}</p>
              </div>
              <Chip tone={org.verificationStatus === "VERIFIED" ? "emerald" : "amber"}>
                {org.verificationStatus === "VERIFIED" ? "Verified" : "Under review"}
              </Chip>
            </div>
            <form
              className="mt-6 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <label className="block">
                <span className="label-mono">Legal name</span>
                <input
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
                />
              </label>
              <label className="block">
                <span className="label-mono">Trading name</span>
                <input
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
                />
              </label>
              <label className="block">
                <span className="label-mono">Sector</span>
                <input
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
                />
              </label>
              <label className="block">
                <span className="label-mono">Website</span>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
                />
              </label>
              <label className="block">
                <span className="label-mono">Address / location</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="label-mono">Public description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40"
                />
              </label>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="accent-gradient mt-2 rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
              >
                {mutation.isPending ? "Saving…" : "Save profile"}
              </button>
            </form>
          </Panel>
          <Panel className="lg:col-span-4">
            <div className="label-mono">Verification status</div>
            <div className="mt-4 text-sm">
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-accent-soft">{org.verificationStatus}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-line">
                <div
                  className={`h-1.5 rounded-full ${org.verificationStatus === "VERIFIED" ? "w-full bg-accent" : "w-1/3 bg-amber"}`}
                />
              </div>
              <p className="mt-4 text-xs text-muted">
                EOZ moderation reviews organisation evidence before granting verified status. Re-verification is required if legal ownership changes.
              </p>
              <p className="mt-4 text-xs text-muted">{org.listingsCount} published listings.</p>
            </div>
          </Panel>
        </section>
      )}
    </SiteShell>
  );
}
