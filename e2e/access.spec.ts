import { expect, test } from "@playwright/test";
import { gotoReady, registerViaApi, signIn, uniqueEmail } from "./helpers";

/** People only see and reach the areas their role allows (policy: src/lib/access.ts). */
test.describe("role-based access", () => {
  test("signed-out visitors are asked to sign in and returned afterwards", async ({ page }) => {
    await gotoReady(page, "/admin/users");
    await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
    await expect(page.getByText("Roles, not shortcuts.")).toHaveCount(0);
    await page.getByRole("main").getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/redirect=%2Fadmin%2Fusers|redirect=\/admin\/users/);
  });

  test("a candidate cannot open employer or staff areas, and sees no staff links", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("access-candidate");
    await registerViaApi(request, "CANDIDATE", "E2E Access Candidate", email);
    await signIn(page, email);
    for (const path of ["/admin", "/admin/exports", "/employers/dashboard", "/employers/post"]) {
      await gotoReady(page, path);
      await expect(
        page.getByRole("heading", { name: "Not part of your account" }),
        path,
      ).toBeVisible();
    }
    await gotoReady(page, "/employers");
    await expect(page.getByRole("navigation", { name: "Section" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Staff console" })).toHaveCount(0);
    await gotoReady(page, "/candidate");
    await expect(page.getByRole("heading", { name: "Not part of your account" })).toHaveCount(0);
  });

  test("an employer cannot open the candidate portal or the staff console", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("access-employer");
    await registerViaApi(request, "EMPLOYER", "E2E Access Employer", email);
    await signIn(page, email);
    for (const path of ["/candidate", "/candidate/profile", "/admin"]) {
      await gotoReady(page, path);
      await expect(
        page.getByRole("heading", { name: "Not part of your account" }),
        path,
      ).toBeVisible();
    }
    await gotoReady(page, "/employers/listings");
    await expect(page.getByRole("heading", { name: "Not part of your account" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Section" })).toBeVisible();
  });
});
