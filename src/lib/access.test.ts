import { describe, expect, it } from "vitest";
import type { ApiUser } from "@/lib/api-client";
import { ADMIN_SECTIONS, allows, ruleFor, safeRedirect } from "./access";

// The seeded role → permission mapping (V2/V25 migrations).
const ROLE_PERMS: Record<string, string[]> = {
  CANDIDATE: [],
  EMPLOYER: [],
  CONTENT_OFFICER: ["CONTENT_MANAGE", "OPPORTUNITY_CREATE", "OPPORTUNITY_MODERATE"],
  RECRUITMENT_OFFICER: ["APPLICATION_MANAGE"],
  SERVICE_OFFICER: ["SERVICE_MANAGE", "SERVICE_VIEW"],
  FINANCE_OFFICER: ["FINANCE_MANAGE", "SERVICE_VIEW"],
  AUDITOR: ["AUDIT_READ", "REPORTS_VIEW"],
  MANAGER: [
    "APPLICATION_MANAGE",
    "CONTENT_MANAGE",
    "FINANCE_MANAGE",
    "OPPORTUNITY_MODERATE",
    "OPPORTUNITY_PUBLISH",
    "ORGANISATION_VERIFY",
    "REPORTS_VIEW",
    "SERVICE_MANAGE",
    "SERVICE_VIEW",
    "STAFF_INBOX_MANAGE",
  ],
  ADMIN: [
    "APPLICATION_MANAGE",
    "AUDIT_READ",
    "CONTENT_MANAGE",
    "FINANCE_MANAGE",
    "OPPORTUNITY_CREATE",
    "OPPORTUNITY_MODERATE",
    "OPPORTUNITY_PUBLISH",
    "ORGANISATION_VERIFY",
    "REPORTS_VIEW",
    "SERVICE_MANAGE",
    "SERVICE_VIEW",
    "SETTINGS_MANAGE",
    "STAFF_INBOX_MANAGE",
    "SYSTEM_MANAGE",
    "USER_MANAGE",
  ],
};

function user(role: string, extra: Partial<ApiUser> = {}): ApiUser {
  return {
    id: role,
    fullName: role,
    email: `${role.toLowerCase()}@example.zm`,
    phone: null,
    emailVerified: true,
    roles: [role],
    opportunityAlertsEnabled: true,
    serviceCommsEnabled: true,
    mustChangePassword: false,
    mfaEnabled: false,
    permissions: ROLE_PERMS[role] ?? [],
    ...extra,
  };
}

function can(u: ApiUser | null, path: string) {
  const guarded = ruleFor(path);
  return guarded ? allows(guarded.rule, u) : true;
}

function sections(u: ApiUser) {
  return ADMIN_SECTIONS.filter((s) => allows(s.rule, u)).map((s) => s.label);
}

describe("access policy", () => {
  it("keeps public pages public", () => {
    for (const path of [
      "/",
      "/opportunities",
      "/employers",
      "/employers/pricing",
      "/candidates",
      "/services",
      "/unsubscribe",
    ]) {
      expect(ruleFor(path), path).toBeNull();
    }
  });

  it("requires sign-in for every portal and account page", () => {
    for (const path of [
      "/candidate",
      "/candidate/profile",
      "/employers/dashboard",
      "/admin",
      "/admin/users",
      "/account",
      "/notifications",
      "/receipt/x",
    ]) {
      expect(can(null, path), path).toBe(false);
    }
  });

  it("candidates reach only the candidate portal and their account", () => {
    const c = user("CANDIDATE");
    expect(can(c, "/candidate/applications")).toBe(true);
    expect(can(c, "/account")).toBe(true);
    for (const path of [
      "/employers/dashboard",
      "/employers/post",
      "/employers/team",
      "/admin",
      "/admin/exports",
      "/admin/users",
    ]) {
      expect(can(c, path), path).toBe(false);
    }
  });

  it("employers reach only the employer portal and their account", () => {
    const e = user("EMPLOYER");
    for (const path of [
      "/employers/dashboard",
      "/employers/listings",
      "/employers/post",
      "/employers/team",
      "/account",
    ]) {
      expect(can(e, path), path).toBe(true);
    }
    for (const path of ["/candidate", "/candidate/profile", "/admin", "/admin/finance"]) {
      expect(can(e, path), path).toBe(false);
    }
  });

  it("team members added to an organisation get the employer portal", () => {
    const member = user("CANDIDATE", { organisationMember: true });
    expect(can(member, "/employers/listings")).toBe(true);
    expect(can(member, "/candidate")).toBe(true);
    expect(can(member, "/admin")).toBe(false);
  });

  it("each staff role sees exactly the console sections its permissions cover", () => {
    expect(sections(user("FINANCE_OFFICER"))).toEqual([
      "Overview",
      "Services",
      "Finance",
      "Exports",
    ]);
    expect(sections(user("SERVICE_OFFICER"))).toEqual(["Overview", "Services", "Exports"]);
    expect(sections(user("RECRUITMENT_OFFICER"))).toEqual([
      "Overview",
      "Recruitment",
      "Applications",
      "Exports",
    ]);
    expect(sections(user("AUDITOR"))).toEqual(["Overview", "Reports", "Exports", "Audit log"]);
    expect(sections(user("CONTENT_OFFICER"))).toEqual([
      "Overview",
      "Opportunities",
      "Moderation",
      "Content",
      "Information Hub",
      "Exports",
    ]);
    expect(sections(user("MANAGER"))).not.toContain("Users & RBAC");
    expect(sections(user("MANAGER"))).not.toContain("Permissions");
    expect(sections(user("MANAGER"))).not.toContain("System health");
    expect(sections(user("ADMIN"))).toHaveLength(ADMIN_SECTIONS.length);
  });

  it("direct links to a section follow the same rules as the menu", () => {
    const finance = user("FINANCE_OFFICER");
    expect(can(finance, "/admin/finance")).toBe(true);
    expect(can(finance, "/admin/users")).toBe(false);
    expect(can(finance, "/admin/recruitment/some-project")).toBe(false);
    expect(can(user("RECRUITMENT_OFFICER"), "/admin/recruitment/some-project")).toBe(true);
    expect(can(user("MANAGER"), "/admin/permissions")).toBe(false);
  });

  it("staff can use the listing form only when they may create listings", () => {
    expect(can(user("CONTENT_OFFICER"), "/employers/post")).toBe(true);
    expect(can(user("ADMIN"), "/employers/post")).toBe(true);
    expect(can(user("FINANCE_OFFICER"), "/employers/post")).toBe(false);
    // …but not the rest of the employer portal, which belongs to organisations.
    expect(can(user("ADMIN"), "/employers/dashboard")).toBe(false);
  });

  it("permission changes take effect: a role given a permission gains that section", () => {
    const custom = user("FINANCE_OFFICER", {
      permissions: ["FINANCE_MANAGE", "SERVICE_VIEW", "AUDIT_READ"],
    });
    expect(can(custom, "/admin/audit")).toBe(true);
  });
});

describe("safeRedirect", () => {
  it("accepts site paths and refuses anything that could leave the site", () => {
    expect(safeRedirect("/admin/reports")).toBe("/admin/reports");
    expect(safeRedirect("/candidate?tab=saved")).toBe("/candidate?tab=saved");
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/auth?mode=signin",
      "",
      42,
    ]) {
      expect(safeRedirect(bad), String(bad)).toBeUndefined();
    }
  });
});
