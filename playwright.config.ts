import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end flows against a running frontend and backend.
 *
 *   E2E_BASE_URL        frontend, default http://localhost:5391
 *   E2E_API_URL         backend API, default http://localhost:8091/api/v1
 *   E2E_ADMIN_EMAIL     an account with the ADMIN role
 *   E2E_ADMIN_PASSWORD  its password
 *
 * Run: npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:5391",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
});
