import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";

type Item = { to: string; label: string };

export function DashNav({ items }: { items: readonly Item[] }) {
  return (
    <nav
      aria-label="Section"
      className="-mx-5 mb-8 overflow-x-auto px-5 pt-2 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <div className="inline-flex min-w-full gap-1 rounded-2xl bg-white/[0.025] p-1.5 ring-1 ring-line backdrop-blur-md lg:flex lg:flex-wrap">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="press shrink-0 rounded-xl px-3.5 py-2 text-xs whitespace-nowrap text-muted transition-all duration-300 hover:bg-white/[0.05] hover:text-fg data-[status=active]:accent-gradient data-[status=active]:font-semibold data-[status=active]:text-ink data-[status=active]:shadow-[0_8px_24px_-10px_rgba(36,180,92,0.7)]"
            activeOptions={{ exact: true }}
          >
            {item.label}
          </Link>
        ))}
      </div>
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
  { to: "/admin/applications", label: "Applications" },
  { to: "/admin/inbox", label: "Inbox" },
  { to: "/admin/notifications", label: "Notifications" },
  { to: "/admin/notification-templates", label: "Email templates" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/testimonials", label: "Testimonials" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/exports", label: "Exports" },
  { to: "/admin/users", label: "Users & RBAC" },
  { to: "/admin/permissions", label: "Permissions" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/audit", label: "Audit log" },
  { to: "/admin/privacy", label: "Privacy requests" },
  { to: "/admin/health", label: "System health" },
] as const;

export function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <div className="hover-lift glass ring-gradient group relative overflow-hidden rounded-2xl p-5 ring-1 ring-line">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(circle, rgba(124,227,164,0.25), transparent 70%)" }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <div className="label-mono">{label}</div>
        {Icon ? (
          <span className="flex size-7 items-center justify-center rounded-lg bg-white/5 ring-1 ring-line transition-colors group-hover:text-accent-soft">
            <Icon
              aria-hidden
              className="size-3.5 shrink-0 text-muted group-hover:text-accent-soft"
            />
          </span>
        ) : null}
      </div>
      <div className={`relative mt-3 font-display text-3xl tracking-tight ${tone ?? ""}`}>
        {value}
      </div>
    </div>
  );
}
