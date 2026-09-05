import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { DashNav, EMPLOYER_NAV } from "@/components/eoz/DashNav";
import { Chip, PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";

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

const MEMBERS = [
  {
    name: "Natasha Phiri",
    email: "natasha@mfumu.zm",
    role: "Organisation owner",
    access: "All employer features",
    state: "Active",
  },
  {
    name: "Kelvin Zulu",
    email: "kelvin@mfumu.zm",
    role: "Recruiter",
    access: "Listings + authorised applicants",
    state: "Active",
  },
  {
    name: "Ruth Chola",
    email: "ruth@mfumu.zm",
    role: "Finance",
    access: "Quotes, invoices + receipts",
    state: "Active",
  },
  {
    name: "Thandi Kunda",
    email: "thandi@mfumu.zm",
    role: "Hiring manager",
    access: "One recruitment project",
    state: "Invited",
  },
];

function EmployerTeam() {
  const [inviting, setInviting] = useState(false);
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
              onClick={() => setInviting((value) => !value)}
              className="accent-gradient inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Invite member
            </button>
          </Panel>
        }
      />
      <DashNav items={EMPLOYER_NAV} />
      {inviting ? (
        <Panel className="mb-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setInviting(false);
            }}
            className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]"
          >
            <label>
              <span className="label-mono">Work email</span>
              <input
                type="email"
                required
                placeholder="name@organisation.zm"
                className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-accent/50"
              />
            </label>
            <label>
              <span className="label-mono">Role</span>
              <select className="mt-1 w-full rounded-md bg-surface-2 px-3 py-2 text-sm ring-1 ring-line">
                <option>Listing manager</option>
                <option>Recruiter</option>
                <option>Finance</option>
                <option>Viewer</option>
              </select>
            </label>
            <button
              type="submit"
              className="accent-gradient self-end rounded-md px-4 py-2 text-sm font-medium text-ink"
            >
              Send invite
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
              <th className="pb-3">Access</th>
              <th className="pb-3">State</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map((member) => (
              <tr key={member.email} className="border-t border-line">
                <td className="py-4">
                  <span className="block">{member.name}</span>
                  <span className="text-xs text-muted">{member.email}</span>
                </td>
                <td className="py-4">{member.role}</td>
                <td className="py-4 text-muted">{member.access}</td>
                <td className="py-4">
                  <Chip tone={member.state === "Active" ? "emerald" : "amber"}>{member.state}</Chip>
                </td>
                <td className="py-4">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-xs text-muted ring-1 ring-line hover:text-fg"
                  >
                    Manage
                  </button>
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
