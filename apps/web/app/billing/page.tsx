"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatErrorForUser, type BillingInvoice, type BillingStatus } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { ErrorBanner } from "@/components/error-banner";
import { useConfig } from "@/components/brand-provider";
import { useAppPage, formatCents } from "@/lib/use-app-page";

function statusTone(status: string): "success" | "warning" | "default" {
  if (status === "active" || status === "trialing" || status === "paid") return "success";
  if (status === "past_due" || status === "unpaid" || status === "open") return "warning";
  return "default";
}

function orderedPlans(plans: Record<string, { id: string; name: string; price_monthly: number | null }>) {
  const order = ["starter", "business", "pro", "enterprise"];
  const list = Object.values(plans);
  return [...order.map((id) => plans[id]).filter(Boolean), ...list.filter((p) => !order.includes(p.id))];
}

export default function BillingPage() {
  const { client } = useAppPage();
  const { pricing } = useConfig();
  const t = useTranslations("billing.manage");
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void Promise.all([client.getBillingStatus(), client.listBillingInvoices()])
      .then(([billingStatus, invoiceRes]) => {
        if (cancelled) return;
        setStatus(billingStatus);
        setInvoices(invoiceRes.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(formatErrorForUser(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  async function openPortal() {
    setActionLoading(true);
    setError("");
    try {
      const portal = await client.createBillingPortal(`${window.location.origin}/billing`);
      if (portal.portal_url) window.location.href = portal.portal_url;
    } catch (err) {
      setError(formatErrorForUser(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function changePlan(planId: string) {
    setActionLoading(true);
    setError("");
    try {
      const session = await client.createCheckout({
        plan_id: planId,
        success_url: `${window.location.origin}/billing/success`,
        cancel_url: `${window.location.origin}/billing`,
      });
      if (session.checkout_url) window.location.href = session.checkout_url;
    } catch (err) {
      setError(formatErrorForUser(err));
    } finally {
      setActionLoading(false);
    }
  }

  const planList = orderedPlans(pricing.plans);
  const currentPlan = planList.find((p) => p.id === status?.plan_id);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="grid max-w-3xl gap-4">
        <ErrorBanner message={error} />

        <Card>
          <CardHeader>
            <CardTitle>{t("currentPlan")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-[var(--brand-text-secondary)]">{t("loading")}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold">{status?.plan_name ?? currentPlan?.name}</span>
                  <Badge tone={statusTone(status?.subscription_status ?? "")}>
                    {status?.subscription_status ?? "—"}
                  </Badge>
                </div>
                {currentPlan?.price_monthly != null && (
                  <p className="text-sm text-[var(--brand-text-secondary)]">
                    {t("pricePerMonth", { price: currentPlan.price_monthly })}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={openPortal} disabled={actionLoading}>
                    {t("updatePaymentMethod")}
                  </Button>
                  <Link
                    href="/settings/billing"
                    className="inline-flex items-center justify-center rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] hover:bg-[var(--brand-surface-elevated)]"
                  >
                    {t("planConfig")}
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("changePlan")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {planList.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-[var(--brand-border)] p-4"
              >
                <p className="font-medium">{plan.name}</p>
                {plan.price_monthly != null && (
                  <p className="text-sm text-[var(--brand-text-secondary)]">
                    {t("pricePerMonth", { price: plan.price_monthly })}
                  </p>
                )}
                <Button
                  className="mt-3 w-full"
                  variant={plan.id === status?.plan_id ? "secondary" : "primary"}
                  disabled={actionLoading || plan.id === status?.plan_id}
                  onClick={() => changePlan(plan.id)}
                >
                  {plan.id === status?.plan_id ? t("current") : t("selectPlan")}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("invoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-[var(--brand-text-secondary)]">{t("loadingInvoices")}</p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-[var(--brand-text-secondary)]">{t("noInvoices")}</p>
            ) : (
              <ul className="divide-y divide-[var(--brand-border)]">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium">{inv.number}</p>
                      <p className="text-xs text-[var(--brand-text-muted)]">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                      <span className="text-sm font-medium">{formatCents(inv.amount_cents)}</span>
                      {inv.pdf_url && (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--brand-accent)]"
                        >
                          PDF
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
