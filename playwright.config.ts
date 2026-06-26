import { defineConfig, devices } from "@playwright/test";

const apiURL = (process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8081").replace(
  /:\/\/localhost\b/,
  "://127.0.0.1",
);
const webURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const apiPort = new URL(apiURL).port || "8081";
const apiV1 = `${apiURL}/api/v1`;
const useExternalServers = process.env.PLAYWRIGHT_EXTERNAL === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: webURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(useExternalServers
    ? {}
    : {
        webServer: [
          {
            command: "make api-e2e",
            url: `${apiURL}/health`,
            cwd: ".",
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
            env: {
              ...process.env,
              E2E_TEST: "1",
              PORT: apiPort,
              PATH: `/usr/local/go/bin:${process.env.PATH ?? ""}`,
            },
          },
          {
            command: "npm run start:e2e:web",
            url: webURL,
            cwd: ".",
            reuseExistingServer: !process.env.CI,
            timeout: 300_000,
            env: {
              ...process.env,
              NEXT_PUBLIC_API_URL: apiV1,
            },
          },
        ],
      }),
});
