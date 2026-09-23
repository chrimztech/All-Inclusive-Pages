import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import {
  api,
  isUnauthenticated,
  ApiError,
  uploadFile,
  organisationLogoUrl,
  BUSINESS_TYPE_LABELS,
  SIZE_BAND_LABELS,
  type ApiOrganisation,
  type BusinessType,
  type OrganisationSizeBand,
} from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/employers/organisation")({
  head: () => ({ meta: [{ title: "Organisation Profile — EOZ Employers" }] }),
  component: Organisation,
});

const inputCls =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/40";

function Organisation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orgsQuery = useQuery({
    queryKey: ["employer", "organisations", "mine"],
    queryFn: () => api.get<ApiOrganisation[]>("/organisations/mine"),
    retry: false,
  });
  const org = orgsQuery.data?.[0];
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [legalName, setLegalName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [sector, setSector] = useState("");
  const [size, setSize] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [businessType, setBusinessType] = useState<string>("");
  const [sizeBand, setSizeBand] = useState<string>("");
  const [tpin, setTpin] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonRole, setContactPersonRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");

  useEffect(() => {
    if (org) {
      setLegalName(org.legalName);
      setTradingName(org.tradingName ?? "");
      setRegistrationNumber(org.registrationNumber ?? "");
      setSector(org.sector ?? "");
      setSize(org.size ?? "");
      setWebsite(org.website ?? "");
      setAddress(org.address ?? "");
      setDescription(org.description ?? "");
      setBusinessType(org.businessType ?? "");
      setSizeBand(org.sizeBand ?? "");
      setTpin(org.tpin ?? "");
      setFoundedYear(org.foundedYear ? String(org.foundedYear) : "");
      setContactPersonName(org.contactPersonName ?? "");
      setContactPersonRole(org.contactPersonRole ?? "");
      setContactPhone(org.contactPhone ?? "");
      setLinkedinUrl(org.linkedinUrl ?? "");
      setFacebookUrl(org.facebookUrl ?? "");
    }
  }, [org]);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/organisations/${org?.id}`, {
        legalName,
        tradingName: tradingName || undefined,
        registrationNumber: registrationNumber || undefined,
        sector: sector || undefined,
        size: size || undefined,
        website: website || undefined,
        address: address || undefined,
        description: description || undefined,
        businessType: businessType || undefined,
        sizeBand: sizeBand || undefined,
        tpin: tpin || undefined,
        foundedYear: foundedYear ? Number(foundedYear) : undefined,
        contactPersonName: contactPersonName || undefined,
        contactPersonRole: contactPersonRole || undefined,
        contactPhone: contactPhone || undefined,
        linkedinUrl: linkedinUrl || undefined,
        facebookUrl: facebookUrl || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "organisations", "mine"] });
      toast("Profile updated.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not save changes.", "error"),
  });

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const asset = await uploadFile<{ id: string }>("/files", file, {
        ownerType: "ORGANISATION_LOGO",
        ownerId: org!.id,
      });
      return api.patch(`/organisations/${org!.id}/logo`, { fileId: asset.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "organisations", "mine"] });
      toast("Logo updated.");
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not upload logo.", "error"),
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
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="group relative size-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-line"
                  title="Change logo"
                >
                  {org.logoFileId ? (
                    <img
                      src={organisationLogoUrl(org.id)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center bg-surface-2 text-[10px] text-muted">
                      Add logo
                    </div>
                  )}
                  <div className="absolute inset-0 hidden items-center justify-center bg-ink/60 text-[10px] text-fg group-hover:flex">
                    {logoMutation.isPending ? "Uploading…" : "Change"}
                  </div>
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) logoMutation.mutate(file);
                    e.target.value = "";
                  }}
                />
                <div>
                  <div className="label-mono">Public profile</div>
                  <h2 className="mt-1 font-display text-2xl">{org.tradingName ?? org.legalName}</h2>
                  <p className="mt-1 text-sm text-muted">{org.sector ?? "Sector not set"}</p>
                </div>
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
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">Trading name</span>
                <input
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="block sm:col-span-2 sm:border-t sm:border-line sm:pt-4">
                <span className="label-mono">Business type</span>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Not set</option>
                  {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((key) => (
                    <option key={key} value={key}>
                      {BUSINESS_TYPE_LABELS[key]}
                    </option>
                  ))}
                </select>
                {businessType === "INFORMAL_SME" ? (
                  <p className="mt-1 text-xs text-muted">
                    No registration number needed — you can still post opportunities and order
                    services.
                  </p>
                ) : null}
              </label>
              <label className="block">
                <span className="label-mono">Team size</span>
                <select
                  value={sizeBand}
                  onChange={(e) => setSizeBand(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Not set</option>
                  {(Object.keys(SIZE_BAND_LABELS) as OrganisationSizeBand[]).map((key) => (
                    <option key={key} value={key}>
                      {SIZE_BAND_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-mono">Registration number (optional)</span>
                <input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="PACRA number, if you have one"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">TPIN (optional)</span>
                <input
                  value={tpin}
                  onChange={(e) => setTpin(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">Founded year (optional)</span>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">Sector</span>
                <input
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="block sm:col-span-2 sm:border-t sm:border-line sm:pt-4">
                <span className="label-mono">Website</span>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">LinkedIn (optional)</span>
                <input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">Facebook (optional)</span>
                <input
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">Address / location</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="block sm:col-span-2 sm:border-t sm:border-line sm:pt-4">
                <span className="label-mono">Primary contact person (optional)</span>
                <input
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  placeholder="Full name"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">Their role</span>
                <input
                  value={contactPersonRole}
                  onChange={(e) => setContactPersonRole(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="label-mono">Their phone</span>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="label-mono">Public description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputCls}
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
                EOZ moderation reviews organisation evidence before granting verified status.
                Re-verification is required if legal ownership changes.
              </p>
              <p className="mt-4 text-xs text-muted">{org.listingsCount} published listings.</p>
            </div>
          </Panel>
        </section>
      )}
    </SiteShell>
  );
}
