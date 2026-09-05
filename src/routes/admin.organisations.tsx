import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { ORGANISATIONS } from "@/lib/eoz-data";

export const Route = createFileRoute("/admin/organisations")({
  head: () => ({
    meta: [
      { title: "Organisations — EOZ Staff Console" },
      {
        name: "description",
        content: "Verify employers, funders and institutions before their listings reach candidates.",
      },
      { property: "og:title", content: "Organisations — EOZ Staff Console" },
      {
        property: "og:description",
        content: "Verification states and posting history for every organisation on the platform.",
      },
    ],
  }),
  component: Organisations,
});

const tone: Record<string, "emerald" | "amber" | "muted"> = {
  VERIFIED: "emerald",
  UNDER_REVIEW: "amber",
  PENDING: "muted",
};

function Organisations() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.2 ) — Organisations"
        title="Who is allowed to post."
        lead="Verification is per-organisation. A verified badge on a listing means the source and the employer were both checked."
      />
      <DashNav items={ADMIN_NAV} />

      <Panel className="mb-14 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="label-mono">
              <th className="pb-3">Organisation</th>
              <th className="pb-3">State</th>
              <th className="pb-3">Listings</th>
              <th className="pb-3">Contact</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {ORGANISATIONS.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="py-3 pr-4">{o.name}</td>
                <td className="py-3 pr-4">
                  <Chip tone={tone[o.state] ?? "muted"}>{o.state}</Chip>
                </td>
                <td className="py-3 pr-4">{o.posts}</td>
                <td className="py-3 pr-4 text-muted">{o.contact}</td>
                <td className="py-3">
                  <button className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg">
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </SiteShell>
  );
}
