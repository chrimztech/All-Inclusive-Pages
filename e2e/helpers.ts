import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API = process.env["E2E_API_URL"] ?? "http://localhost:8091/api/v1";
export const PASSWORD = "Password123!";

export function uniqueEmail(prefix: string) {
  return `e2e-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.zm`;
}

/** Creates an account through the API (sign-up UI is covered by its own test). */
export async function registerViaApi(
  request: APIRequestContext,
  accountType: "CANDIDATE" | "EMPLOYER",
  fullName: string,
  email: string,
) {
  const response = await request.post(`${API}/auth/register`, {
    data: { fullName, email, password: PASSWORD, accountType },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/**
 * Opens a page and waits until React has hydrated it (the root sets html[data-hydrated]). Clicks and typing on the
 * server-rendered HTML before that are silently lost.
 */
export async function gotoReady(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated='true']").waitFor({ state: "attached", timeout: 30_000 });
}

/** Signs in through the real sign-in page and waits to leave it. */
export async function signIn(page: Page, email: string, password = PASSWORD) {
  await gotoReady(page, "/auth?mode=signin");
  await page.getByLabel(/email/i).first().fill(email);
  await page
    .getByLabel(/^password/i)
    .first()
    .fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/auth/);
}

export async function signOut(page: Page) {
  await page.context().clearCookies();
}
