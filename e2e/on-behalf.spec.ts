import { expect, test } from "@playwright/test";
import { PASSWORD, signIn, signOut, gotoReady } from "./helpers";

/**
 * Staff post an advert for an organisation that is not registered on EOZ: no organisation has to be chosen or created
 * first, and the public listing is marked unverified.
 */
test.describe.serial("staff posting on behalf of an organisation", () => {
  const title = `E2E Behalf Accountant ${Date.now()}`;
  const organisation = `E2E Water Trust ${Date.now()}`;
  const adminEmail = process.env["E2E_ADMIN_EMAIL"];
  const adminPassword = process.env["E2E_ADMIN_PASSWORD"] ?? PASSWORD;

  test("an administrator publishes for an unregistered organisation straight away", async ({
    page,
  }) => {
    test.skip(!adminEmail, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the staff steps.");
    await signIn(page, adminEmail!, adminPassword);
    await gotoReady(page, "/employers/post");

    await expect(page.getByText("Unverified", { exact: true })).toBeVisible();
    await expect(page.getByText("Choose the organisation above first")).toHaveCount(0);

    await page.getByLabel(/opportunity title/i).fill(title);
    const category = page.getByLabel(/^category/i);
    await expect(category.locator("option")).not.toHaveCount(1);
    await category.selectOption({ index: 1 });
    await page.getByLabel(/^organisation/i).fill(organisation);
    const closing = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    await page.getByLabel(/closing date/i).fill(closing);
    await page.getByText("Apply on EOZ", { exact: true }).click();
    await page
      .getByLabel(/^summary/i)
      .fill("Keep the trust's accounts for its rural water schemes.");
    await page.getByText("Publish immediately").click();
    await page.getByRole("button", { name: /publish now/i }).click();

    await expect(page.getByRole("heading", { name: "Published." })).toBeVisible();
  });

  test("the public listing names the organisation and says it is unverified", async ({ page }) => {
    test.skip(!adminEmail, "Needs the staff step to publish the listing.");
    await signOut(page);
    await gotoReady(page, "/opportunities");
    await page.getByPlaceholder(/title, organisation or reference/i).fill(title);
    await page
      .getByRole("link", { name: new RegExp(title) })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText("Unverified", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/published by eoz on behalf of/i)).toBeVisible();
    await expect(page.getByText(organisation).first()).toBeVisible();
  });

  test("searching for an organisation that isn't on EOZ still lets staff post, and adds it", async ({
    page,
  }) => {
    test.skip(!adminEmail, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the staff steps.");
    const newcomer = `E2E Mansa Bakery ${Date.now()}`;
    await signIn(page, adminEmail!, adminPassword);
    await gotoReady(page, "/employers/post");

    await page.getByRole("button", { name: /link a registered organisation instead/i }).click();
    await page.getByPlaceholder(/search by legal or trading name/i).fill(newcomer);
    await expect(page.getByText("No registered organisation matches.")).toBeVisible();
    await page.getByRole("button", { name: `Post for "${newcomer}" (not on EOZ yet)` }).click();
    await expect(page.getByLabel(/^organisation/i)).toHaveValue(newcomer);
    await expect(page.getByLabel(/add this organisation to the eoz directory/i)).toBeChecked();

    await page.getByLabel(/opportunity title/i).fill(`E2E Baker ${Date.now()}`);
    const category = page.getByLabel(/^category/i);
    await expect(category.locator("option")).not.toHaveCount(1);
    await category.selectOption({ index: 1 });
    const closing = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    await page.getByLabel(/closing date/i).fill(closing);
    await page.getByText("Apply on EOZ", { exact: true }).click();
    await page.getByLabel(/^summary/i).fill("Early-morning baking for the Mansa branch.");
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByRole("heading", { name: "Submitted for review." })).toBeVisible();

    // It is now in the directory as unverified, ready to be linked next time.
    await gotoReady(page, "/employers/post");
    await page.getByRole("button", { name: /link a registered organisation instead/i }).click();
    await page.getByPlaceholder(/search by legal or trading name/i).fill(newcomer);
    const match = page.getByRole("list", { name: "Organisations" }).getByRole("button", {
      name: new RegExp(newcomer),
    });
    await expect(match).toBeVisible();
    await expect(match.getByText("PENDING")).toBeVisible();
  });
});
