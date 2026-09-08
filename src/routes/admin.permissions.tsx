import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { DashNav, ADMIN_NAV } from "@/components/eoz/DashNav";
import { Button } from "@/components/eoz/Button";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

type Permission = { code: string; description: string };
type RoleWithPermissions = { name: string; description: string; permissionCodes: string[] };

export const Route = createFileRoute("/admin/permissions")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — Echo Opportunities Zambia" },
      {
        name: "description",
        content: "Configure which permissions each staff role holds across the EOZ platform.",
      },
      { property: "og:title", content: "Roles & Permissions — Echo Opportunities Zambia" },
      {
        property: "og:description",
        content: "Assign fine-grained permissions to staff roles for the EOZ platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPermissions,
});

function AdminPermissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const permissionsQuery = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => api.get<Permission[]>("/admin/permissions"),
    retry: false,
  });
  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => api.get<RoleWithPermissions[]>("/admin/roles"),
    retry: false,
  });

  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const draftFor = (role: RoleWithPermissions) => drafts[role.name] ?? role.permissionCodes;

  const toggle = (role: RoleWithPermissions, code: string) => {
    const current = draftFor(role);
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    setDrafts((d) => ({ ...d, [role.name]: next }));
  };

  const save = useMutation({
    mutationFn: ({ roleName, permissionCodes }: { roleName: string; permissionCodes: string[] }) =>
      api.put(`/admin/roles/${roleName}/permissions`, { permissionCodes }),
    onMutate: ({ roleName }) => setSavingRole(roleName),
    onSuccess: (_data, { roleName }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      setDrafts((d) => {
        const rest = { ...d };
        delete rest[roleName];
        return rest;
      });
      toast(`${roleName.replaceAll("_", " ").toLowerCase()} permissions saved.`);
    },
    onError: (error) =>
      toast(error instanceof ApiError ? error.message : "Could not save permissions.", "error"),
    onSettled: () => setSavingRole(null),
  });

  const permissions = permissionsQuery.data ?? [];
  const roles = rolesQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 06 ) — Staff console"
        title="Roles & permissions"
        lead="Choose exactly what each staff role can do. The ADMIN role always holds every permission and can't be edited."
      />
      <DashNav items={ADMIN_NAV} />

      {isUnauthenticated(rolesQuery.error) ? (
        <Panel className="mb-4">
          <p className="text-sm text-muted">Sign in with an admin account to manage roles and permissions.</p>
        </Panel>
      ) : null}

      {rolesQuery.isLoading ? (
        <Panel>
          <p className="text-xs text-muted">Loading…</p>
        </Panel>
      ) : (
        <section className="grid gap-4 pb-14 lg:grid-cols-2">
          {roles.map((role) => {
            const isAdmin = role.name === "ADMIN";
            const draft = draftFor(role);
            const dirty =
              !isAdmin &&
              (draft.length !== role.permissionCodes.length ||
                draft.some((c) => !role.permissionCodes.includes(c)));

            return (
              <Panel key={role.name}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="eyebrow">{role.name.replaceAll("_", " ")}</div>
                  {isAdmin ? <Chip tone="muted">Fixed — always full access</Chip> : null}
                </div>
                <p className="mb-4 text-xs text-muted">{role.description}</p>

                <div className="space-y-2">
                  {permissions.map((perm) => {
                    const checked = isAdmin ? true : draft.includes(perm.code);
                    return (
                      <label
                        key={perm.code}
                        className={`flex items-start justify-between gap-3 border-b border-line pb-2 text-sm last:border-0 last:pb-0 ${
                          isAdmin ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        }`}
                      >
                        <span>
                          <span className="block text-fg">{perm.code}</span>
                          <span className="block text-xs text-muted">{perm.description}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isAdmin}
                          onChange={() => toggle(role, perm.code)}
                          className="mt-1 size-4 shrink-0 accent-current"
                        />
                      </label>
                    );
                  })}
                </div>

                {!isAdmin ? (
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      size="sm"
                      loading={savingRole === role.name && save.isPending}
                      loadingText="Saving…"
                      disabled={!dirty}
                      onClick={() => save.mutate({ roleName: role.name, permissionCodes: draft })}
                    >
                      Save changes
                    </Button>
                    {dirty ? <span className="text-xs text-muted">Unsaved changes</span> : null}
                  </div>
                ) : null}
              </Panel>
            );
          })}
        </section>
      )}
    </SiteShell>
  );
}
