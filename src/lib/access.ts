import type { ApiUser } from "@/lib/api-client";

/**
 * Who may open which part of the web app. One table, used by the route gate (pages you can't use never render),
 * every section menu, and the header/footer links. It mirrors the API's own checks — the API still enforces every
 * rule itself; this only decides what people see and can navigate to.
 */
export type Rule =
  | { kind: "signedIn" }
  | { kind: "candidate" }
  | { kind: "employer"; orPerms?: readonly string[] }
  | { kind: "staff" }
  | { kind: "perms"; perms: readonly string[] }
  | { kind: "role"; role: string };

/** Staff are people whose roles carry any permission (candidate and employer roles carry none). */
export function isStaff(user: ApiUser | null): boolean {
  return !!user && (user.permissions ?? []).length > 0;
}

export function isCandidate(user: ApiUser | null): boolean {
  return !!user && user.roles.includes("CANDIDATE");
}

/** Employer accounts, and anyone added to an organisation's team. */
export function isEmployer(user: ApiUser | null): boolean {
  return !!user && (user.roles.includes("EMPLOYER") || user.organisationMember === true);
}

export function allows(rule: Rule, user: ApiUser | null): boolean {
  if (!user) return false;
  if (user.roles.includes("ADMIN") && rule.kind !== "candidate" && rule.kind !== "employer")
    return true;
  switch (rule.kind) {
    case "signedIn":
      return true;
    case "candidate":
      return isCandidate(user);
    case "employer":
      return isEmployer(user) || (rule.orPerms ?? []).some((p) => user.permissions.includes(p));
    case "staff":
      return isStaff(user);
    case "perms":
      return rule.perms.some((p) => user.permissions.includes(p));
    case "role":
      return user.roles.includes(rule.role);
  }
}

/** Staff console sections. perms mirror the @PreAuthorize checks on the endpoints each page uses. */
export const ADMIN_SECTIONS: readonly { to: string; label: string; rule: Rule }[] = [
  { to: "/admin", label: "Overview", rule: { kind: "staff" } },
  {
    to: "/admin/opportunities",
    label: "Opportunities",
    rule: { kind: "perms", perms: ["OPPORTUNITY_MODERATE"] },
  },
  {
    to: "/admin/moderation",
    label: "Moderation",
    rule: { kind: "perms", perms: ["OPPORTUNITY_MODERATE"] },
  },
  {
    to: "/admin/organisations",
    label: "Organisations",
    rule: { kind: "perms", perms: ["ORGANISATION_VERIFY"] },
  },
  {
    to: "/admin/recruitment",
    label: "Recruitment",
    rule: { kind: "perms", perms: ["APPLICATION_MANAGE"] },
  },
  {
    to: "/admin/services",
    label: "Services",
    rule: { kind: "perms", perms: ["SERVICE_VIEW", "SERVICE_MANAGE"] },
  },
  { to: "/admin/content", label: "Content", rule: { kind: "perms", perms: ["CONTENT_MANAGE"] } },
  { to: "/admin/finance", label: "Finance", rule: { kind: "perms", perms: ["FINANCE_MANAGE"] } },
  {
    to: "/admin/applications",
    label: "Applications",
    rule: { kind: "perms", perms: ["APPLICATION_MANAGE"] },
  },
  { to: "/admin/inbox", label: "Inbox", rule: { kind: "perms", perms: ["STAFF_INBOX_MANAGE"] } },
  {
    to: "/admin/notifications",
    label: "Notifications",
    rule: { kind: "perms", perms: ["STAFF_INBOX_MANAGE"] },
  },
  {
    to: "/admin/notification-templates",
    label: "Email templates",
    rule: { kind: "perms", perms: ["SETTINGS_MANAGE"] },
  },
  {
    to: "/admin/categories",
    label: "Categories",
    rule: { kind: "perms", perms: ["SETTINGS_MANAGE"] },
  },
  {
    to: "/admin/testimonials",
    label: "Testimonials",
    rule: { kind: "perms", perms: ["SETTINGS_MANAGE"] },
  },
  { to: "/admin/reports", label: "Reports", rule: { kind: "perms", perms: ["REPORTS_VIEW"] } },
  { to: "/admin/exports", label: "Exports", rule: { kind: "staff" } },
  { to: "/admin/users", label: "Users & RBAC", rule: { kind: "perms", perms: ["USER_MANAGE"] } },
  { to: "/admin/permissions", label: "Permissions", rule: { kind: "role", role: "ADMIN" } },
  { to: "/admin/settings", label: "Settings", rule: { kind: "perms", perms: ["SETTINGS_MANAGE"] } },
  { to: "/admin/audit", label: "Audit log", rule: { kind: "perms", perms: ["AUDIT_READ"] } },
  {
    to: "/admin/privacy",
    label: "Privacy requests",
    rule: { kind: "perms", perms: ["USER_MANAGE"] },
  },
  {
    to: "/admin/health",
    label: "System health",
    rule: { kind: "perms", perms: ["SYSTEM_MANAGE"] },
  },
];

/** Employer pages that are public marketing, not part of the employer portal. */
const PUBLIC_EMPLOYER_PAGES = new Set(["/employers", "/employers/", "/employers/pricing"]);

/** The rule for a path, or null when the page is public. */
export function ruleFor(pathname: string): { rule: Rule; label: string } | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/admin" || path.startsWith("/admin/")) {
    const section = [...ADMIN_SECTIONS]
      .filter((s) => path === s.to || path.startsWith(s.to + "/"))
      .sort((a, b) => b.to.length - a.to.length)[0];
    return section
      ? { rule: section.rule, label: section.label }
      : { rule: { kind: "staff" }, label: "Staff console" };
  }
  if (path === "/candidate" || path.startsWith("/candidate/")) {
    return { rule: { kind: "candidate" }, label: "Candidate portal" };
  }
  if (path.startsWith("/employers/") && !PUBLIC_EMPLOYER_PAGES.has(path)) {
    // Staff who create listings use the same form (the API allows OPPORTUNITY_CREATE too).
    if (path === "/employers/post") {
      return {
        rule: { kind: "employer", orPerms: ["OPPORTUNITY_CREATE"] },
        label: "Post an opportunity",
      };
    }
    return { rule: { kind: "employer" }, label: "Employer portal" };
  }
  if (path === "/account" || path === "/notifications" || path.startsWith("/receipt/")) {
    return { rule: { kind: "signedIn" }, label: "Your account" };
  }
  return null;
}

/**
 * A post-sign-in destination taken from the URL, accepted only when it is a path on this site. Rejects
 * "https://…", protocol-relative "//host" and "/\\host" (which browsers treat as another host) — an open-redirect
 * guard — and the sign-in page itself.
 */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  if (value.startsWith("/auth")) return undefined;
  return value;
}
