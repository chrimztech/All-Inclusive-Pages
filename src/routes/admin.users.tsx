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
  phone?: string | null;
  status: string;
  roles: string[];
};

const EMPTY_NEW_USER = { fullName: "", email: "", phone: "", role: "CANDIDATE" };

type IssuedCredential = { name: string; email: string; password: string };

function Users() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  const [editingDetailsFor, setEditingDetailsFor] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [copied, setCopied] = useState(false);
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
      toast(
        variables.status === "ACTIVE"
          ? "Account reactivated."
          : variables.status === "DEACTIVATED"
            ? "Account deactivated."
            : "Account suspended.",
      );
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update account status.", "error"),
  });
  const doResetPassword = useMutation({
    mutationFn: (user: AdminUser) =>
      api.post<{ temporaryPassword: string }>(`/admin/users/${user.id}/reset-password`, {}),
    onSuccess: (result, user) => {
      setIssued({ name: user.fullName, email: user.email, password: result.temporaryPassword });
      setCopied(false);
      toast("One-time password generated. The user was signed out everywhere.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not reset password.", "error"),
  });
  const saveDetails = useMutation({
    mutationFn: ({ id, fullName, phone }: { id: string; fullName: string; phone: string }) =>
      api.patch(`/admin/users/${id}`, { fullName, phone }),
    onSuccess: () => {
      invalidate();
      setEditingDetailsFor(null);
      toast("User details updated.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not update user.", "error"),
  });
  const permanentDelete = useMutation({
    mutationFn: ({ id, confirm }: { id: string; confirm: string }) =>
      api.del(`/admin/permanent-delete/users/${id}?confirm=${encodeURIComponent(confirm)}`),
    onSuccess: () => {
      invalidate();
      toast("Account permanently deleted.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not delete the account.", "error"),
  });
  const createUser = useMutation({
    mutationFn: () => api.post<{ fullName: string; email: string; temporaryPassword: string }>("/admin/users", newUser),
    onSuccess: (created) => {
      invalidate();
      setAddingUser(false);
      setNewUser(EMPTY_NEW_USER);
      setIssued({ name: created.fullName, email: created.email, password: created.temporaryPassword });
      setCopied(false);
      toast("User created.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not create user.", "error"),
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
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="rounded-md bg-surface-2 px-3 py-1.5 text-xs outline-none ring-1 ring-line"
          />
          <button
            type="button"
            onClick={() => setAddingUser((v) => !v)}
            className="press accent-gradient rounded-md px-3 py-1.5 text-xs text-ink"
          >
            {addingUser ? "Cancel" : "+ Add user"}
          </button>
        </div>
      </div>

      {issued ? (
        <Panel className="mb-6 ring-1 ring-amber/40">
          <div className="label-mono">One-time password — shown once</div>
          <p className="mt-2 text-sm text-muted">
            Give this to <strong className="text-fg">{issued.name}</strong> ({issued.email}) securely. It is not stored in
            readable form and cannot be shown again. They will be asked to choose their own password when they sign in.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-surface-2 px-3 py-2 font-mono text-base tracking-wider ring-1 ring-line">
              {issued.password}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(issued.password).then(() => setCopied(true)).catch(() => {});
              }}
              className="rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setIssued(null)}
              className="rounded-md px-3 py-2 text-xs text-muted ring-1 ring-line hover:text-fg"
            >
              Done
            </button>
          </div>
        </Panel>
      ) : null}

      {addingUser ? (
        <Panel className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate();
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1 text-xs text-muted">
              Full name
              <input
                required
                value={newUser.fullName}
                onChange={(e) => setNewUser((v) => ({ ...v, fullName: e.target.value }))}
                className="rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Email
              <input
                required
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((v) => ({ ...v, email: e.target.value }))}
                className="rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Phone (optional)
              <input
                value={newUser.phone}
                onChange={(e) => setNewUser((v) => ({ ...v, phone: e.target.value }))}
                className="rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Role
              <select
                value={newUser.role}
                onChange={(e) => setNewUser((v) => ({ ...v, role: e.target.value }))}
                className="rounded-md bg-surface-2 px-3 py-2 text-sm text-fg outline-none ring-1 ring-line"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-muted sm:col-span-2">
              A one-time password is generated for the new account. The user must replace it the first time they sign in.
            </p>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={createUser.isPending}
                className="press accent-gradient rounded-md px-4 py-2 text-sm text-ink disabled:opacity-60"
              >
                {createUser.isPending ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

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
                    {u.status !== "DEACTIVATED" ? (
                      <button
                        disabled={toggleStatus.isPending}
                        onClick={() =>
                          toggleStatus.mutate({ id: u.id, status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })
                        }
                        className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                      >
                        {u.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </button>
                    ) : null}
                    {u.status !== "DEACTIVATED" ? (
                      <button
                        disabled={toggleStatus.isPending}
                        onClick={() => {
                          if (window.confirm(`Deactivate ${u.fullName}'s account? They can no longer sign in, but the account can be restored.`)) {
                            toggleStatus.mutate({ id: u.id, status: "DEACTIVATED" });
                          }
                        }}
                        className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        disabled={toggleStatus.isPending}
                        onClick={() => toggleStatus.mutate({ id: u.id, status: "ACTIVE" })}
                        className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg disabled:opacity-60"
                      >
                        Restore
                      </button>
                    )}
                    {editingDetailsFor === u.id ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          aria-label="Full name"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="rounded-md bg-surface-2 px-2 py-1 text-xs outline-none ring-1 ring-line"
                        />
                        <input
                          aria-label="Phone"
                          placeholder="Phone"
                          value={draftPhone}
                          onChange={(e) => setDraftPhone(e.target.value)}
                          className="rounded-md bg-surface-2 px-2 py-1 text-xs outline-none ring-1 ring-line"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={saveDetails.isPending || !draftName.trim()}
                            onClick={() => saveDetails.mutate({ id: u.id, fullName: draftName, phone: draftPhone })}
                            className="accent-gradient rounded-md px-3 py-1 text-xs text-ink disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDetailsFor(null)}
                            className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDetailsFor(u.id);
                          setDraftName(u.fullName);
                          setDraftPhone(u.phone ?? "");
                        }}
                        className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
                      >
                        Edit details
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={doResetPassword.isPending}
                      onClick={() => {
                        if (window.confirm(`Generate a new one-time password for ${u.fullName}? Their current password stops working and they are signed out everywhere.`)) {
                          doResetPassword.mutate(u);
                        }
                      }}
                      className="rounded-md px-3 py-1 text-xs text-muted ring-1 ring-line hover:text-fg"
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      disabled={permanentDelete.isPending}
                      onClick={() => {
                        const typed = window.prompt(
                          `PERMANENT DELETE. This erases ${u.fullName} and their applications, orders, files and profile. It cannot be undone.

Type their email (${u.email}) to confirm:`,
                        );
                        if (typed) permanentDelete.mutate({ id: u.id, confirm: typed });
                      }}
                      className="rounded-md px-3 py-1 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                    >
                      Delete
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
