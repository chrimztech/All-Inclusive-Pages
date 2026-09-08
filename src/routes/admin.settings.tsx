import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, ADMIN_NAV } from "@/components/eoz/DashNav";
import { CATEGORIES } from "@/lib/eoz-data";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

type FeatureFlag = { key: string; enabled: boolean; description: string | null };

const field =
  "mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line focus:ring-accent/50";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Platform Settings — Echo Opportunities Zambia" },
      {
        name: "description",
        content:
          "Staff settings for Echo Opportunities Zambia: moderation rules, categories, contact details and distribution channel configuration.",
      },
      { property: "og:title", content: "Platform Settings — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Configure moderation rules, categories and contact details for the EOZ platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettings,
});

type Setting = { key: string; value: string };

function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api.get<Setting[]>("/admin/settings"),
    retry: false,
  });
  const flagsQuery = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => api.get<FeatureFlag[]>("/admin/feature-flags"),
    retry: false,
  });
  const toggleFlag = useMutation({
    mutationFn: (flag: FeatureFlag) =>
      api.put(`/admin/feature-flags/${flag.key}`, { enabled: !flag.enabled, description: flag.description }),
    onSuccess: (_data, flag) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
      toast(`${flag.key.replace(/^moderation\./, "").replace(/-/g, " ")} turned ${flag.enabled ? "off" : "on"}.`);
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update the setting.", "error"),
  });

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tagline, setTagline] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tiktok, setTiktok] = useState("");

  useEffect(() => {
    if (settingsQuery.data) {
      const map = Object.fromEntries(settingsQuery.data.map((s) => [s.key, s.value]));
      setName(map["org.name"] ?? "");
      setLocation(map["org.location"] ?? "");
      setPhone(map["org.phone"] ?? "");
      setEmail(map["org.email"] ?? "");
      setTagline(map["org.tagline"] ?? "");
      setWhatsapp(map["org.social.whatsapp"] ?? "");
      setFacebook(map["org.social.facebook"] ?? "");
      setLinkedin(map["org.social.linkedin"] ?? "");
      setTiktok(map["org.social.tiktok"] ?? "");
    }
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      Promise.all([
        api.put("/admin/settings/org.name", { value: name }),
        api.put("/admin/settings/org.location", { value: location }),
        api.put("/admin/settings/org.phone", { value: phone }),
        api.put("/admin/settings/org.email", { value: email }),
        api.put("/admin/settings/org.tagline", { value: tagline }),
        api.put("/admin/settings/org.social.whatsapp", { value: whatsapp }),
        api.put("/admin/settings/org.social.facebook", { value: facebook }),
        api.put("/admin/settings/org.social.linkedin", { value: linkedin }),
        api.put("/admin/settings/org.social.tiktok", { value: tiktok }),
      ]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast("Organisation details saved.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save changes.", "error"),
  });

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06 ) — Staff console"
        title="Platform settings"
        lead="Moderation rules, taxonomy and the organisation details shown across the site."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(settingsQuery.error) ? (
        <Panel className="mb-4">
          <p className="text-sm text-muted">Sign in with an admin account to change platform settings.</p>
        </Panel>
      ) : null}

      <section className="grid gap-4 pb-14 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel>
            <div className="eyebrow mb-1">Moderation rules</div>
            {isUnauthenticated(flagsQuery.error) ? (
              <p className="mb-4 text-xs text-muted">Sign in with an admin account to view moderation rules.</p>
            ) : flagsQuery.isLoading ? (
              <p className="mb-4 text-xs text-muted">Loading…</p>
            ) : (
              <div className="space-y-4">
                {(flagsQuery.data ?? []).map((flag) => (
                  <button
                    type="button"
                    key={flag.key}
                    onClick={() => toggleFlag.mutate(flag)}
                    disabled={toggleFlag.isPending}
                    className="flex w-full items-start justify-between gap-4 border-b border-line pb-4 text-left last:border-0 last:pb-0 disabled:opacity-60"
                  >
                    <div>
                      <div className="text-sm text-fg">{flag.key.replace(/^moderation\./, "").replace(/-/g, " ")}</div>
                      <div className="mt-1 text-xs text-muted">{flag.description}</div>
                    </div>
                    <Chip tone={flag.enabled ? "emerald" : "muted"}>{flag.enabled ? "On" : "Off"}</Chip>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <div className="eyebrow mb-4">Organisation details</div>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <label className="block text-sm">
                <span className="label-mono">Public name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Location</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className={field} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="label-mono">Tagline</span>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={field} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">WhatsApp channel URL</span>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={field} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">Facebook URL</span>
                <input value={facebook} onChange={(e) => setFacebook(e.target.value)} className={field} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">LinkedIn URL</span>
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className={field} />
              </label>
              <label className="block text-sm">
                <span className="label-mono">TikTok URL</span>
                <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} className={field} />
              </label>
              <button
                type="submit"
                disabled={save.isPending}
                className="accent-gradient rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
              >
                {save.isPending ? "Saving…" : "Save changes"}
              </button>
            </form>
          </Panel>
        </div>

        <Panel>
          <div className="eyebrow mb-3">Categories</div>
          <ul className="space-y-2 text-sm text-muted">
            {CATEGORIES.map((category) => (
              <li
                key={category}
                className="flex items-center justify-between border-b border-line pb-2 last:border-0"
              >
                <span>{category}</span>
                <span className="font-mono text-[10px] text-muted">
                  {category.toLowerCase().replaceAll(" ", "-")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Categories are managed via the API's category seed data.</p>
        </Panel>
      </section>
    </SiteShell>
  );
}
