import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./safe-url";
import { filterSaved } from "./saved-search";
import { notificationLink } from "@/components/eoz/NotificationBell";

describe("safeHttpUrl", () => {
  it("accepts http and https links", () => {
    expect(safeHttpUrl("https://careers.example.zm/apply")?.hostname).toBe("careers.example.zm");
    expect(safeHttpUrl("  http://example.zm  ")?.protocol).toBe("http:");
  });

  it("refuses script, data and relative links", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("/relative/path")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});

describe("filterSaved", () => {
  const items = [
    { reference: "EOZ-OPP-2026-000027", organisationName: "Zambeef Products Plc", title: "Graduate Trainee Programme" },
    { reference: "EOZ-OPP-2026-000030", organisationName: "Lusaka Youth Trust", title: "Community Health Volunteer" },
  ];

  it("returns everything for an empty query", () => {
    expect(filterSaved(items, "  ")).toHaveLength(2);
  });

  it("matches a reference however it is typed", () => {
    expect(filterSaved(items, "eoz opp 2026 000027").map((i) => i.title)).toEqual(["Graduate Trainee Programme"]);
    expect(filterSaved(items, "OPP-2026-000030").map((i) => i.title)).toEqual(["Community Health Volunteer"]);
  });

  it("requires every word to match organisation, title or reference", () => {
    expect(filterSaved(items, "zambeef trainee")).toHaveLength(1);
    expect(filterSaved(items, "zambeef volunteer")).toHaveLength(0);
  });
});

describe("notificationLink", () => {
  it("routes each notification to the page that deals with it", () => {
    expect(notificationLink("APPLICATION_STATUS", ["CANDIDATE"])).toBe("/candidate/applications");
    expect(notificationLink("JOB_ALERT", ["CANDIDATE"])).toBe("/opportunities");
    expect(notificationLink("DEADLINE_REMINDER", ["CANDIDATE"])).toBe("/candidate/saved");
    expect(notificationLink("OPPORTUNITY_APPROVED", ["EMPLOYER"])).toBe("/employers/listings");
    expect(notificationLink("SERVICE_QUOTE_ISSUED", ["CANDIDATE"])).toBe("/candidate/orders");
    expect(notificationLink("SERVICE_QUOTE_ISSUED", ["EMPLOYER"])).toBe("/employers/services");
    expect(notificationLink("SECURITY_ALERT", ["ADMIN"])).toBe("/admin/audit");
    expect(notificationLink("SOMETHING_NEW", ["CANDIDATE"])).toBe("/notifications");
  });
});
