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
  await activateBillingViaAPI(request, token);
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
  await activateBillingViaAPI(request, token);
  await completeOnboardingViaAPI(request, token);
  await verifyAuthToken(request, token);
  await seedBrowserAuthStorage(page, token, completedOnboardingState);
  await waitForAuthMe(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  return token;
}

const platformAdmin = {
  email: process.env.PLATFORM_ADMIN_EMAIL ?? "admin@fieldforge.local",
  password: process.env.PLATFORM_ADMIN_PASSWORD ?? "Admin123!",
};

/** Activate SaaS subscription in mock Stripe mode (debug.mock_stripe). */
export async function activateBillingViaAPI(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const res = await request.post(`${apiBase}/api/v1/billing/mock-complete`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

export async function platformAdminToken(request: APIRequestContext): Promise<string> {
  const loginRes = await request.post(`${apiBase}/api/v1/platform/auth/login`, {
    data: { email: platformAdmin.email, password: platformAdmin.password },
  });
  expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
  const body = await loginRes.json();
  return body.token as string;
}

export async function fetchTenantSlug(
  request: APIRequestContext,
  tenantId: string,
  adminToken?: string,
): Promise<string> {
  const token = adminToken ?? (await platformAdminToken(request));
  const res = await request.get(`${apiBase}/api/v1/platform/tenants`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { data: { id: string; slug: string }[] };
  const tenant = body.data.find((t) => t.id === tenantId);
  if (!tenant) {
    throw new Error(`tenant ${tenantId} not found in platform tenant list`);
  }
  return tenant.slug;
}

export type PortalFixtures = {
  customerId: string;
  tenantSlug: string;
  customerEmail: string;
};

/** Staff session with billing active and a CRM customer for portal magic-link login. */
export async function setupPortalFixtures(
  request: APIRequestContext,
  staffToken: string,
  stamp = Date.now(),
): Promise<PortalFixtures> {
  await activateBillingViaAPI(request, staffToken);

  const meRes = await request.get(`${apiBase}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  expect(meRes.ok(), await meRes.text()).toBeTruthy();
  const me = (await meRes.json()) as { tenant_id: string };

  const tenantSlug = await fetchTenantSlug(request, me.tenant_id);
  const customerEmail = `portal-${stamp}@example.com`;

  const createCustomerRes = await request.post(`${apiBase}/api/v1/crm/customers`, {
    headers: { Authorization: `Bearer ${staffToken}` },
    data: { name: `Portal Customer ${stamp}`, email: customerEmail },
  });
  expect(createCustomerRes.ok(), await createCustomerRes.text()).toBeTruthy();
  const customer = (await createCustomerRes.json()) as { id: string };

  return { customerId: customer.id, tenantSlug, customerEmail };
}

export async function createSentInvoiceForCustomer(
  request: APIRequestContext,
  staffToken: string,
  customerId: string,
  totalCents = 25_000,
): Promise<{ id: string; invoice_number: string }> {
  const createRes = await request.post(`${apiBase}/api/v1/invoicing/invoices`, {
    headers: { Authorization: `Bearer ${staffToken}` },
    data: { customer_id: customerId, total_cents: totalCents },
  });
  expect(createRes.ok(), await createRes.text()).toBeTruthy();
  const invoice = (await createRes.json()) as { id: string; invoice_number: string };

  const sendRes = await request.post(
    `${apiBase}/api/v1/invoicing/invoices/${invoice.id}/send`,
    {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: {},
    },
  );
  expect(sendRes.ok(), await sendRes.text()).toBeTruthy();
  return invoice;
}

/** Portal customer JWT via dev magic link (requires debug.skip_email_send). */
export async function portalTokenViaAPI(
  request: APIRequestContext,
  email: string,
  tenantSlug: string,
): Promise<string> {
  const loginRes = await request.post(`${apiBase}/api/v1/public/portal/login`, {
    data: { email, tenant_slug: tenantSlug },
  });
  expect(loginRes.ok(), await loginRes.text()).toBeTruthy();
  const body = (await loginRes.json()) as { dev_token?: string };
  expect(body.dev_token, "portal dev_token requires debug.skip_email_send").toBeTruthy();

  const verifyRes = await request.post(`${apiBase}/api/v1/public/portal/verify`, {
    data: { token: body.dev_token },
  });
  expect(verifyRes.ok(), await verifyRes.text()).toBeTruthy();
  const session = (await verifyRes.json()) as { token: string };
  return session.token;
}

export async function seedPortalAuthStorage(page: Page, token: string): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem("ff_portal_token", t);
  }, token);
  await page.goto("/portal/login", { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => {
    localStorage.setItem("ff_portal_token", t);
  }, token);
}

export async function waitForPortalInvoices(page: Page, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    const remaining = deadline - Date.now();
    const attemptTimeout = Math.min(remaining, Math.max(12_000, Math.floor(timeoutMs / 3)));

    try {
      const navigate =
        attempt === 1
          ? page.goto("/portal/invoices", { waitUntil: "domcontentloaded" })
          : page.reload({ waitUntil: "domcontentloaded" });
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/portal/invoices") && r.status() === 200,
          { timeout: attemptTimeout },
        ),
        navigate,
      ]);
      return;
    } catch {
      if (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      break;
    }
  }

  throw new Error(`GET /portal/invoices did not return 200 within ${timeoutMs}ms`);
}

export async function seedStaffTokenOnly(page: Page, token: string): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem("ff_token", t);
  }, token);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => localStorage.setItem("ff_token", t), token);

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/auth/me") && r.status() === 200,
      { timeout: 30_000 },
    ),
    page.reload({ waitUntil: "domcontentloaded" }),
  ]);
}
