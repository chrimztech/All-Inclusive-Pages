import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { ADMIN_NAV, DashNav } from "@/components/eoz/DashNav";
import { api, ApiError, isUnauthenticated, type PageResponse } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

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

const ROLES = [
  "CANDIDATE",
  "EMPLOYER",
  "CONTENT_OFFICER",
  "RECRUITMENT_OFFICER",
  "SERVICE_OFFICER",
  "FINANCE_OFFICER",
  "MANAGER",
  "ADMIN",
  "AUDITOR",
];

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  roles: string[];
};

function Users() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const usersQuery = useQuery({
    queryKey: ["admin", "users", query],
    queryFn: () => api.get<PageResponse<AdminUser>>("/admin/users", { q: query || undefined, size: 50 }),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      invalidate();
      toast(variables.status === "ACTIVE" ? "Account reactivated." : "Account suspended.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update account status.", "error"),
  });
  const saveRoles = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) => api.patch(`/admin/users/${id}/roles`, { roles }),
    onSuccess: () => {
      invalidate();
      setEditingRolesFor(null);
      toast("Roles updated.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update roles.", "error"),
  });

  const users = usersQuery.data?.items ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06.3 ) — Users & RBAC"
        title="Roles, not shortcuts."
        lead="Access is granted by role. Every grant or revocation is written to the audit log."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(usersQuery.error) ? (
        <Panel className="mb-4">
          <p className="text-sm text-muted">Sign in with an admin account to manage users.</p>
        </Panel>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <span key={r} className="rounded-full px-3 py-1 font-mono text-[10px] text-muted ring-1 ring-line">
              {r}
            </span>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="rounded-md bg-surface-2 px-3 py-1.5 text-xs outline-none ring-1 ring-line"
        />
      </div>

      <Panel className="mb-14 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="label-mono">
              <th className="pb-3">Name</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Roles</th>
              <th className="pb-3">State</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line align-top">
                <td className="py-3 pr-4">{u.fullName}</td>
                <td className="py-3 pr-4 text-muted">{u.email}</td>
                <td className="py-3 pr-4">
                  {editingRolesFor === u.id ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        {ROLES.map((r) => (
                          <label key={r} className="flex items-center gap-1.5 text-[11px] text-muted">
                            <input
                              type="checkbox"
                              checked={draftRoles.includes(r)}
                              onChange={(e) =>
                                setDraftRoles((prev) =>
                                  e.target.checked ? [...prev, r] : prev.filter((role) => role !== r),
                                )
                              }
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saveRoles.isPending || draftRoles.length === 0}
                          onClick={() => saveRoles.mutate({ id: u.id, roles: draftRoles })}
                          className="rounded-md px-3 py-1 text-xs text-ink accent-gradient disabled:opacity-60"
                        >
                          {saveRoles.isPending ? "Saving…" : "Save roles"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRolesFor(null)}
                          className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Chip key={r}>{r}</Chip>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <Chip tone={u.status === "ACTIVE" ? "emerald" : "rose"}>{u.status}</Chip>
                </td>
                <td className="py-3">
                  <div className="flex flex-col items-start gap-2">
                    <button
                      disabled={toggleStatus.isPending}
                      onClick={() =>
                        toggleStatus.mutate({ id: u.id, status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })
                      }
                      className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                    >
                      {u.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                    </button>
                    {editingRolesFor !== u.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRolesFor(u.id);
                          setDraftRoles(u.roles);
                        }}
                        className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
                      >
                        Edit roles
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </SiteShell>
  );
}
