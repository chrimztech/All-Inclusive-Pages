import { expect, test } from "@playwright/test";
import { PASSWORD, registerViaApi, signIn, signOut, uniqueEmail } from "./helpers";

/**
 * The core journey, in order: an employer submits an EOZ-hosted listing, staff approve and publish it, a visitor
 * finds it on the public board, and a candidate applies and sees the application in their portal.
 */
test.describe.serial("listing lifecycle", () => {
  const stamp = Date.now();
  const title = `E2E Field Officer ${stamp}`;
  const employerEmail = uniqueEmail("employer");
  const candidateEmail = uniqueEmail("candidate");
  const adminEmail = process.env["E2E_ADMIN_EMAIL"];
  const adminPassword = process.env["E2E_ADMIN_PASSWORD"] ?? PASSWORD;

  test("employer submits a listing without an online portal", async ({ page, request }) => {
    await registerViaApi(request, "EMPLOYER", "E2E Employer", employerEmail);
    await signIn(page, employerEmail);
    await page.goto("/employers/post");

    await page.getByLabel(/opportunity title/i).fill(title);
    const category = page.getByLabel(/^category/i);
    await expect(category.locator("option")).not.toHaveCount(1);
    await category.selectOption({ index: 1 });
    await page.getByLabel(/^organisation/i).fill("E2E Cooperative");
    const closing = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    await page.getByLabel(/closing date/i).fill(closing);
    await page.getByText("Apply on EOZ", { exact: true }).click();
    await page.getByLabel(/^summary/i).fill("Support farmer groups across Central Province.");
    await page.getByRole("button", { name: /submit for review/i }).click();

    await expect(page.getByText(/submitted for review/i).first()).toBeVisible();
  });

  test("staff approve and publish it from the moderation queue", async ({ page }) => {
    test.skip(!adminEmail, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the staff step.");
    await signIn(page, adminEmail!, adminPassword);
    await page.goto("/admin/moderation");
    const card = page.locator("div", { has: page.getByRole("heading", { name: title }) }).last();
    await card.getByRole("button", { name: /^approve$/i }).click();
    await expect(card.getByRole("button", { name: /^publish$/i })).toBeVisible();
    await card.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  });

  test("a visitor finds it on the board with the employer's route", async ({ page }) => {
    test.skip(!adminEmail, "Needs the staff step to publish the listing.");
    await signOut(page);
    await page.goto("/opportunities");
    await page.getByPlaceholder(/title, organisation or reference/i).fill(title);
    await page.getByRole("link", { name: new RegExp(title) }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText(/published by eoz on behalf of/i)).toBeVisible();
    await expect(page.getByText("Share this opportunity")).toBeVisible();
  });

  test("a candidate applies and tracks the application", async ({ page, request }) => {
    test.skip(!adminEmail, "Needs the staff step to publish the listing.");
    await registerViaApi(request, "CANDIDATE", "E2E Candidate", candidateEmail);
    await signIn(page, candidateEmail);
    await page.goto("/opportunities");
    await page.getByPlaceholder(/title, organisation or reference/i).fill(title);
    await page.getByRole("link", { name: new RegExp(title) }).first().click();
    await page.getByPlaceholder(/optional note to the hiring team/i).fill("I have five years of field experience.");
    await page.getByRole("button", { name: /apply through eoz/i }).click();
    await expect(page.getByText(/application submitted/i)).toBeVisible();

    await page.goto("/candidate/applications");
    await expect(page.getByText(title).first()).toBeVisible();
  });
});
