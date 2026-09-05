import { Link } from "@tanstack/react-router";

type Item = { to: string; label: string };

export function DashNav({ items }: { items: readonly Item[] }) {
  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs text-muted ring-1 ring-line transition-colors hover:text-fg"
          activeProps={{ className: "accent-gradient text-ink font-medium ring-0" }}
          activeOptions={{ exact: true }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export const CANDIDATE_NAV = [
  { to: "/candidate", label: "Overview" },
  { to: "/candidate/applications", label: "Applications" },
  { to: "/candidate/saved", label: "Saved" },
  { to: "/candidate/profile", label: "Profile" },
  { to: "/candidate/documents", label: "Documents" },
  { to: "/candidate/orders", label: "Service orders" },
  { to: "/candidate/messages", label: "Messages" },
  { to: "/candidate/alerts", label: "Alerts" },
  { to: "/candidate/notifications", label: "Notifications" },
  { to: "/candidate/account", label: "Account & privacy" },
] as const;

export const EMPLOYER_NAV = [
  { to: "/employers", label: "Overview" },
  { to: "/employers/dashboard", label: "Dashboard" },
  { to: "/employers/listings", label: "Listings" },
  { to: "/employers/post", label: "Post opportunity" },
  { to: "/employers/applicants", label: "Applicants" },
  { to: "/employers/organisation", label: "Organisation" },
  { to: "/employers/analytics", label: "Analytics" },
  { to: "/employers/recruitment", label: "Recruitment" },
  { to: "/employers/services", label: "Services" },
  { to: "/employers/finance", label: "Invoices & payments" },
  { to: "/employers/team", label: "Team access" },
] as const;

export const ADMIN_NAV = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/opportunities", label: "Opportunities" },
  { to: "/admin/moderation", label: "Moderation" },
  { to: "/admin/organisations", label: "Organisations" },
  { to: "/admin/recruitment", label: "Recruitment" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/content", label: "Content" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/notifications", label: "Notifications" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/users", label: "Users & RBAC" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/audit", label: "Audit log" },
  { to: "/admin/health", label: "System health" },
] as const;

export function StatTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="glass rounded-lg p-4 ring-1 ring-line">
      <div className="label-mono">{label}</div>
      <div className={`mt-1 font-display text-2xl ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
