import { expect, test } from "@playwright/test";
import { apiBase, completeOnboardingViaAPI, loginToken, seedAuthSession, signupViaAPI, verifyAuthToken } from "./helpers";

type Job = {
  id: string;
  estimate_id?: string;
  title: string;
  status: string;
};

type Invoice = {
  id: string;
  job_id?: string;
  invoice_number: string;
  status: string;
  total_cents: number;
};

const JOB_POLL_TIMEOUT_MS = process.env.CI ? 90_000 : 60_000;
const INVOICE_POLL_TIMEOUT_MS = process.env.CI ? 90_000 : 60_000;

async function nudgeOutboxPoll(request: import("@playwright/test").APIRequestContext): Promise<void> {
  const res = await request.post(`${apiBase}/e2e/outbox/poll`);
  if (res.status() === 404) return;
  expect(res.ok(), await res.text()).toBeTruthy();
}

async function gotoJobsAndWaitForList(
  page: import("@playwright/test").Page,
  timeoutMs = JOB_POLL_TIMEOUT_MS,
): Promise<import("@playwright/test").Response> {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    const remaining = deadline - Date.now();
    const attemptTimeout = Math.min(remaining, Math.max(15_000, Math.floor(timeoutMs / 3)));

    try {
      const navigate =
        attempt === 1
          ? page.goto("/jobs", { waitUntil: "domcontentloaded" })
          : page.reload({ waitUntil: "domcontentloaded" });
      const [jobsRes] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/scheduling/jobs") && r.status() === 200,
          { timeout: attemptTimeout },
        ),
        navigate,
      ]);
      return jobsRes;
    } catch {
      if (Date.now() >= deadline) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw new Error(`GET /scheduling/jobs did not return 200 within ${timeoutMs}ms`);
}

async function pollForJobByEstimate(
  request: import("@playwright/test").APIRequestContext,
  token: string,
  estimateId: string,
  timeoutMs = JOB_POLL_TIMEOUT_MS,
): Promise<Job> {
  const deadline = Date.now() + timeoutMs;
  let delayMs = 250;
  while (Date.now() < deadline) {
    await nudgeOutboxPoll(request);
    const res = await request.get(`${apiBase}/api/v1/scheduling/jobs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { data: Job[] | null };
    const job = (body.data ?? []).find((j) => j.estimate_id === estimateId);
    if (job) return job;
    await new Promise((r) => setTimeout(r, delayMs));
    delayMs = Math.min(delayMs * 2, 2_000);
  }
  throw new Error(`job for estimate ${estimateId} not found within ${timeoutMs}ms`);
}

async function pollForInvoiceByJob(
  request: import("@playwright/test").APIRequestContext,
  token: string,
  jobId: string,
  timeoutMs = INVOICE_POLL_TIMEOUT_MS,
): Promise<Invoice> {
  const deadline = Date.now() + timeoutMs;
  let delayMs = 250;
  while (Date.now() < deadline) {
    await nudgeOutboxPoll(request);
    const res = await request.get(`${apiBase}/api/v1/invoicing/invoices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = (await res.json()) as { data: Invoice[] | null };
    const invoice = (body.data ?? []).find((inv) => inv.job_id === jobId);
    if (invoice) return invoice;
    await new Promise((r) => setTimeout(r, delayMs));
    delayMs = Math.min(delayMs * 2, 2_000);
  }
  throw new Error(`invoice for job ${jobId} not found within ${timeoutMs}ms`);
}

test.describe("estimate quote outbox saga", () => {
  test("create estimate, send and accept quote, job appears on /jobs", async ({ page, request }) => {
    test.setTimeout(process.env.CI ? 180_000 : 120_000);
    const stamp = Date.now();
    const estimateTitle = `E2E HVAC install ${stamp}`;

    const user = await signupViaAPI(request, stamp);
    const token = await seedAuthSession(page, request, user);

    const createRes = await request.post(`${apiBase}/api/v1/estimating/estimates`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: estimateTitle,
        lines: [{ description: "Unit install", quantity: 1, unit_price_cents: 15_000 }],
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const estimate = (await createRes.json()) as { id: string; title: string };

    const sendRes = await request.post(`${apiBase}/api/v1/estimating/estimates/${estimate.id}/send`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(sendRes.ok(), await sendRes.text()).toBeTruthy();

    const acceptRes = await request.post(`${apiBase}/api/v1/estimating/estimates/${estimate.id}/accept`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(acceptRes.ok(), await acceptRes.text()).toBeTruthy();

    await nudgeOutboxPoll(request);
    const job = await pollForJobByEstimate(request, token, estimate.id);
    expect(job.title).toBe(estimateTitle);
    expect(job.status).toBe("draft");

    const jobsRes = await gotoJobsAndWaitForList(page);
    const jobsBody = (await jobsRes.json()) as { data: Job[] | null };
    expect((jobsBody.data ?? []).some((j) => j.title === estimateTitle)).toBeTruthy();

    await expect(page.getByRole("heading", { level: 1, name: "Jobs" })).toBeVisible();
  });

  test("accept quote, complete job, draft invoice appears", async ({ request }) => {
    test.setTimeout(process.env.CI ? 180_000 : 120_000);
    const stamp = Date.now();
    const estimateTitle = `E2E complete saga ${stamp}`;
    const lineTotalCents = 15_000;

    const user = await signupViaAPI(request, stamp);
    const token = await loginToken(request, user);
    await completeOnboardingViaAPI(request, token);
    await verifyAuthToken(request, token);

    const createRes = await request.post(`${apiBase}/api/v1/estimating/estimates`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: estimateTitle,
        lines: [{ description: "Unit install", quantity: 1, unit_price_cents: lineTotalCents }],
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const estimate = (await createRes.json()) as { id: string };

    const sendRes = await request.post(`${apiBase}/api/v1/estimating/estimates/${estimate.id}/send`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(sendRes.ok(), await sendRes.text()).toBeTruthy();

    const acceptRes = await request.post(`${apiBase}/api/v1/estimating/estimates/${estimate.id}/accept`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(acceptRes.ok(), await acceptRes.text()).toBeTruthy();

    await nudgeOutboxPoll(request);
    const job = await pollForJobByEstimate(request, token, estimate.id);
    expect(job.status).toBe("draft");

    const completeRes = await request.post(`${apiBase}/api/v1/scheduling/jobs/${job.id}/complete`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(completeRes.ok(), await completeRes.text()).toBeTruthy();
    const completed = (await completeRes.json()) as { status: string; job_id: string };
    expect(completed.status).toBe("completed");
    expect(completed.job_id).toBe(job.id);

    await nudgeOutboxPoll(request);
    const invoice = await pollForInvoiceByJob(request, token, job.id);
    expect(invoice.status).toBe("draft");
    expect(invoice.job_id).toBe(job.id);
    expect(invoice.invoice_number).toMatch(/^INV-/);
  });
});
