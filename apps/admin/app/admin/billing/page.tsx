"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@fieldforge/ui";
import {
  formatErrorForUser,
  type PlatformBillingSettings,
  type PlatformPlan,
} from "@fieldforge/sdk";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

export default function BillingPage() {
  const { client } = useAdminPage();
  const [settings, setSettings] = useState<PlatformBillingSettings | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [trialDays, setTrialDays] = useState("14");
  const [defaultPlanId, setDefaultPlanId] = useState("starter");
  const [successUrl, setSuccessUrl] = useState("");
  const [cancelUrl, setCancelUrl] = useState("");
  const [portalUrl, setPortalUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [billing, planRes] = await Promise.all([
        client.getBillingSettings(),
        client.listPlans(),
      ]);
      setSettings(billing);
      setPlans(planRes.data);
      setTrialDays(String(billing.trial_days ?? 0));
      setDefaultPlanId(billing.default_plan_id || "starter");
      setSuccessUrl(billing.checkout_success_url ?? "");
      setCancelUrl(billing.checkout_cancel_url ?? "");
      setPortalUrl(billing.portal_return_url ?? "");
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function validate(): string | null {
    const days = parseInt(trialDays, 10);
    if (Number.isNaN(days) || days < 0) {
      return "Trial days must be 0 or greater (0 = no trial).";
    }
    if (!defaultPlanId) {
      return "Default plan is required.";
    }
    const urlFields = [
      { label: "Checkout success URL", value: successUrl },
      { label: "Checkout cancel URL", value: cancelUrl },
      { label: "Portal return URL", value: portalUrl },
    ];
    for (const field of urlFields) {
      const v = field.value.trim();
      if (!v) continue;
      if (!v.startsWith("/") && !v.startsWith("https://") && !v.startsWith("http://localhost")) {
        return `${field.label} must be a path starting with / or an https:// URL.`;
      }
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await client.updateBillingSettings({
        trial_days: parseInt(trialDays, 10),
        default_plan_id: defaultPlanId,
        checkout_success_url: successUrl.trim(),
        checkout_cancel_url: cancelUrl.trim(),
        portal_return_url: portalUrl.trim(),
      });
      setSettings(updated);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  const activePlans = plans.filter((p) => p.active);

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Trial period, default plan, and Stripe checkout redirect URLs."
        actions={
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading billing settings…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--brand-text-primary)]">Subscription</h2>
            <div className="form-field">
              <label className="form-label">Trial days</label>
              <Input
                type="number"
                min="0"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
              <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                Set to 0 to disable free trials on new checkouts.
              </p>
            </div>
            <div className="form-field">
              <label className="form-label">Default plan</label>
              <select
                className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                value={defaultPlanId}
                onChange={(e) => setDefaultPlanId(e.target.value)}
              >
                {activePlans.length === 0 && <option value={defaultPlanId}>{defaultPlanId}</option>}
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.id})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                Used when signup does not specify a plan.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--brand-text-primary)]">Checkout URLs</h2>
            <p className="mb-4 text-sm text-[var(--brand-text-secondary)]">
              Optional overrides for Stripe checkout and billing portal redirects. Leave blank to use app defaults.
            </p>
            <div className="form-field">
              <label className="form-label">Checkout success URL</label>
              <Input
                value={successUrl}
                onChange={(e) => setSuccessUrl(e.target.value)}
                placeholder="/billing/success"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Checkout cancel URL</label>
              <Input
                value={cancelUrl}
                onChange={(e) => setCancelUrl(e.target.value)}
                placeholder="/billing/cancel"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Portal return URL</label>
              <Input
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                placeholder="/billing"
              />
            </div>
            {settings?.updated_at && (
              <p className="text-xs text-[var(--brand-text-muted)]">
                Last updated {new Date(settings.updated_at).toLocaleString()}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
