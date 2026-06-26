import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** Avoid Node resolving localhost to ::1 when API listens on IPv4 only. */
export const apiBase = (
  process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8081"
).replace(/:\/\/localhost\b/, "://127.0.0.1");

export type TestUser = {
  email: string;
  password: string;
  company: string;
};

export const completedOnboardingState = {
  version: 1,
  currentStep: "complete",
  completed: true,
  industryPacks: ["field-services"],
  profile: { companyState: "CA", teamSize: "1", logoUrl: "" },
  modules: {
    crm: true,
    estimating: true,
    scheduling: true,
    invoicing: true,
    dispatch: true,
    expenses: true,
    "job-costing": true,
  },
  setup: { stripeSkipped: true, csvSkipped: true, inviteEmails: [] },
};

function enabledModules(): string[] {
  return Object.entries(completedOnboardingState.modules)
    .filter(([, on]) => on)
    .map(([id]) => id);
}

export async function signupViaAPI(
  request: APIRequestContext,
  stamp = Date.now(),
): Promise<TestUser> {
  const email = `e2e-${stamp}@example.com`;
  const password = "e2e-password-123";
  const company = `E2E Co ${stamp}`;

  const signupRes = await request.post(`${apiBase}/api/v1/auth/signup`, {
    data: {
      company_name: company,
      email,
      password,
      industry_pack: "field-services",
      plan_id: "starter",
    },
  });
  expect(signupRes.ok(), await signupRes.text()).toBeTruthy();

  return { email, password, company };
}

export async function completeOnboardingViaAPI(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const headers = { Authorization: `Bearer ${token}` };

  const industryRes = await request.post(`${apiBase}/api/v1/onboarding/industry`, {
    headers,
    data: { industry_packs: completedOnboardingState.industryPacks },
  });
  expect(industryRes.ok(), await industryRes.text()).toBeTruthy();

  const profileRes = await request.post(`${apiBase}/api/v1/onboarding/profile`, {
    headers,
    data: {
      state: completedOnboardingState.profile.companyState,
      team_size: completedOnboardingState.profile.teamSize,
      logo_url: completedOnboardingState.profile.logoUrl,
    },
  });
  expect(profileRes.ok(), await profileRes.text()).toBeTruthy();

  const modulesRes = await request.patch(`${apiBase}/api/v1/onboarding/modules`, {
    headers,
    data: { modules: enabledModules() },
  });
  expect(modulesRes.ok(), await modulesRes.text()).toBeTruthy();

  const skipRes = await request.post(`${apiBase}/api/v1/onboarding/skip-setup`, {
    headers,
    data: {},
  });
  expect(skipRes.ok(), await skipRes.text()).toBeTruthy();

  const completeRes = await request.post(`${apiBase}/api/v1/onboarding/complete`, {
    headers,
    data: {},
  });
  expect(completeRes.ok(), await completeRes.text()).toBeTruthy();
}

export async function loginToken(
  request: APIRequestContext,
  user: TestUser,
): Promise<string> {
  const loginRes = await request.post(`${apiBase}/api/v1/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
  const body = await loginRes.json();
  return body.token as string;
}

const AUTH_ME_TIMEOUT_MS = process.env.CI ? 45_000 : 30_000;

function isAuthMeOk(response: { url: () => string; status: () => number }): boolean {
  return response.url().includes("/auth/me") && response.status() === 200;
}

/** Poll API until token is accepted — avoids racing the browser before the backend is ready. */
export async function verifyAuthToken(
  request: APIRequestContext,
  token: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    const res = await request.get(`${apiBase}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    lastStatus = res.status();
    if (res.ok()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `GET /auth/me did not return 200 (last status ${lastStatus}) within ${timeoutMs}ms`,
  );
}

async function seedBrowserAuthStorage(
  page: Page,
  token: string,
  onboarding: typeof completedOnboardingState,
): Promise<void> {
  await page.addInitScript(
    ({ token: t, onboarding: ob }) => {
      localStorage.setItem("ff_token", t);
      localStorage.setItem("ff_onboarding", JSON.stringify(ob));
    },
    { token, onboarding },
  );

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ token: t, onboarding: ob }) => {
      localStorage.setItem("ff_token", t);
      localStorage.setItem("ff_onboarding", JSON.stringify(ob));
    },
    { token, onboarding },
  );
}

/** Wait for browser GET /auth/me (200), reloading once if the auth provider missed the first fetch. */
async function waitForAuthMe(page: Page, timeoutMs = AUTH_ME_TIMEOUT_MS): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    const remaining = deadline - Date.now();
    const attemptTimeout = Math.min(remaining, Math.max(12_000, Math.floor(timeoutMs / 3)));

    try {
      const navigate =
        attempt === 1
          ? page.goto("/dashboard", { waitUntil: "domcontentloaded" })
          : page.reload({ waitUntil: "domcontentloaded" });
      await Promise.all([
        page.waitForResponse(isAuthMeOk, { timeout: attemptTimeout }),
        navigate,
      ]);
      return;
    } catch {
      if (Date.now() >= deadline) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw new Error(`browser GET /auth/me did not return 200 within ${timeoutMs}ms`);
}

async function assertDashboardReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: /Welcome back,/i })).toBeVisible({
    timeout: 15_000,
  });
}

export async function loginViaAPI(
  page: Page,
  request: APIRequestContext,
  user: TestUser,
): Promise<void> {
  const token = await loginToken(request, user);
  await completeOnboardingViaAPI(request, token);
  await verifyAuthToken(request, token);
  await seedBrowserAuthStorage(page, token, completedOnboardingState);
  await waitForAuthMe(page);
  await assertDashboardReady(page);
}

export async function seedAuthSession(
  page: Page,
  request: APIRequestContext,
  user: TestUser,
): Promise<string> {
  const token = await loginToken(request, user);
  await completeOnboardingViaAPI(request, token);
  await verifyAuthToken(request, token);
  await seedBrowserAuthStorage(page, token, completedOnboardingState);
  await waitForAuthMe(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  return token;
}
