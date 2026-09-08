import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { api, ApiError, isUnauthenticated } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/employers/team")({
  head: () => ({
    meta: [
      { title: "Team Access - EOZ Employer Portal" },
      {
        name: "description",
        content: "Manage organisation members and least-privilege EOZ portal access.",
      },
    ],
  }),
  component: EmployerTeam,
});

type Organisation = { id: string; legalName: string; tradingName: string | null };
type Member = { userId: string; fullName: string; email: string; roleInOrg: string; status: string };

function EmployerTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");

  const orgsQuery = useQuery({
    queryKey: ["employer", "my-organisations"],
    queryFn: () => api.get<Organisation[]>("/organisations/mine"),
    retry: false,
  });
  const organisation = orgsQuery.data?.[0];

  const membersQuery = useQuery({
    queryKey: ["employer", "members", organisation?.id],
    queryFn: () => api.get<Member[]>(`/organisations/${organisation!.id}/members`),
    enabled: !!organisation,
    retry: false,
  });

  const invite = useMutation({
    mutationFn: () => api.post(`/organisations/${organisation!.id}/members`, { email, roleInOrg: role }),
    onSuccess: () => {
      setInviting(false);
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["employer", "members", organisation?.id] });
      toast("Invite sent.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not send the invite.", "error"),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => api.del(`/organisations/${organisation!.id}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", "members", organisation?.id] });
      toast("Member removed.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not remove member.", "error"),
  });

  const members = membersQuery.data ?? [];

  return (
    <SiteShell>
      <PageIntro
        eyebrow="( 05.11 ) - Team access"
        title="Give people only the access they need."
        lead="Invite organisation members by responsibility, keep applicant access project-specific and revoke access as soon as roles change."
        aside={
          <Panel>
            <button
              type="button"
              disabled={!organisation}
              onClick={() => setInviting((value) => !value)}
              className="accent-gradient inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Invite member
            </button>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />

      {isUnauthenticated(orgsQuery.error) ? (
        <Panel className="mb-4">
          <p className="text-sm text-muted">Sign in as an employer to manage your organisation's team.</p>
        </Panel>
      ) : null}
      {orgsQuery.isSuccess && !organisation ? (
        <Panel className="mb-4">
          <p className="text-sm text-muted">You don't belong to an organisation yet — register one first.</p>
        </Panel>
      ) : null}

      {inviting && organisation ? (
        <Panel className="mb-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              invite.mutate();
            }}
            className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]"
          >
            <label>
              <span className="label-mono">Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organisation.zm"
                className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50"
              />
            </label>
            <label>
              <span className="label-mono">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm ring-1 ring-line"
              >
                <option value="MEMBER">Member</option>
                <option value="OWNER">Owner</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={invite.isPending}
              className="accent-gradient self-end rounded-md px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {invite.isPending ? "Sending…" : "Send invite"}
            </button>
          </form>
        </Panel>
      ) : null}

      <Panel className="mb-14 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="label-mono">
            <tr>
              <th className="pb-3">Member</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">State</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-t border-line">
                <td className="py-4">
                  <span className="block">{member.fullName}</span>
                  <span className="text-xs text-muted">{member.email}</span>
                </td>
                <td className="py-4">{member.roleInOrg === "OWNER" ? "Organisation owner" : "Member"}</td>
                <td className="py-4">
                  <Chip tone={member.status === "ACTIVE" ? "emerald" : "amber"}>{member.status}</Chip>
                </td>
                <td className="py-4">
                  {member.roleInOrg !== "OWNER" ? (
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(member.userId)}
                      className="rounded-md px-3 py-1.5 text-xs text-rose ring-1 ring-rose/30 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
          Applicant views, exports, role changes and revoked sessions are recorded in the audit log.
        </p>
      </Panel>
    </SiteShell>
  );
}
