import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { USERS } from "@/lib/eoz-data";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — EOZ Staff Console" },
      {
        name: "description",
        content: "Manage candidate, employer, staff, admin and auditor accounts and their role assignments.",
      },
      { property: "og:title", content: "Users & Roles — EOZ Staff Console" },
      {
        property: "og:description",
        content: "Role-based access control for every account on the EOZ platform.",
      },
    ],
  }),
  component: Users,
});

const ROLES = ["CANDIDATE", "EMPLOYER", "STAFF", "ADMIN", "AUDITOR"];

function Users() {
  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.3 ) — Users & RBAC"
        title="Roles, not shortcuts."
        lead="Access is granted by role. Every grant or revocation is written to the audit log."
      />
      <DashNav items={ADMIN_NAV} />

      <div className="mb-4 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <span key={r} className="rounded-full px-3 py-1 font-mono text-[10px] text-muted ring-1 ring-line">
            {r}
          </span>
        ))}
      </div>

      <Panel className="mb-14 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="label-mono">
              <th className="pb-3">Name</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">State</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="py-3 pr-4">{u.name}</td>
                <td className="py-3 pr-4 text-muted">{u.email}</td>
                <td className="py-3 pr-4">
                  <Chip>{u.role}</Chip>
                </td>
                <td className="py-3 pr-4">
                  <Chip tone={u.state === "Active" ? "emerald" : "rose"}>{u.state}</Chip>
                </td>
                <td className="py-3">
                  <button className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg">
                    Manage
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
