import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { FieldForgeClient } from "./index";

const BASE = "http://api.test/v1";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("FieldForgeClient integrations", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("listIntegrations returns catalog", async () => {
    globalThis.fetch = async () =>
      jsonResponse({
        data: [{ id: "quickbooks", name: "QuickBooks Online", enabled: true, category: "accounting", description: "" }],
      });

    const client = new FieldForgeClient(BASE, "tok");
    const result = await client.listIntegrations();
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].id, "quickbooks");
  });

  it("startQuickBooksOAuth returns mock authorize URL", async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /\/integrations\/quickbooks\/oauth\/start/);
      return jsonResponse({ authorize_url: "http://localhost/cb?code=mock_qb_code", state: "st-1", mock: true });
    };

    const client = new FieldForgeClient(BASE, "tok");
    const result = await client.startQuickBooksOAuth("http://localhost/cb");
    assert.equal(result.state, "st-1");
    assert.ok(result.mock);
    assert.match(result.authorize_url, /mock_qb_code/);
  });

  it("completeQuickBooksOAuth posts code and state", async () => {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/integrations\/quickbooks\/oauth\/callback/);
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.code, "mock_qb_code");
      assert.equal(body.state, "st-1");
      return jsonResponse({ integration_id: "quickbooks", status: "connected", updated_at: "2026-01-01T00:00:00Z" });
    };

    const client = new FieldForgeClient(BASE, "tok");
    const result = await client.completeQuickBooksOAuth("mock_qb_code", "st-1");
    assert.equal(result.status, "connected");
  });

  it("calculateAvalaraTax returns mock tax breakdown", async () => {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/integrations\/avalara\/tax\/calculate/);
      assert.equal(init?.method, "POST");
      return jsonResponse({
        amount_cents: 10000,
        tax_cents: 825,
        total_cents: 10825,
        rate_percent: 8.25,
        jurisdiction: "TX 78701",
        mock: true,
        provider: "Avalara AvaTax",
        integration_id: "avalara",
      });
    };

    const client = new FieldForgeClient(BASE, "tok");
    const result = await client.calculateAvalaraTax({ amount_cents: 10000, ship_to_state: "TX", ship_to_zip: "78701" });
    assert.equal(result.tax_cents, 825);
    assert.ok(result.mock);
  });

  it("startStripeConnectOnboarding returns onboarding URL", async () => {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/integrations\/stripe-connect\/onboard/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.return_path, "/settings/integrations");
      return jsonResponse({
        onboarding_url: "http://localhost/settings/integrations?stripe_connect=mock&account_id=acct_1",
        account_id: "acct_1",
        mock: true,
      });
    };

    const client = new FieldForgeClient(BASE, "tok");
    const result = await client.startStripeConnectOnboarding("/settings/integrations");
    assert.equal(result.account_id, "acct_1");
    assert.ok(result.mock);
  });

  it("completeStripeConnect posts account_id", async () => {
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /\/integrations\/stripe-connect\/complete/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.account_id, "acct_1");
      return jsonResponse({
        integration_id: "stripe_connect",
        status: "connected",
        charges_enabled: true,
        payouts_enabled: true,
        mock: true,
      });
    };

    const client = new FieldForgeClient(BASE, "tok");
    const result = await client.completeStripeConnect("acct_1");
    assert.equal(result.status, "connected");
    assert.ok(result.charges_enabled);
  });
});
