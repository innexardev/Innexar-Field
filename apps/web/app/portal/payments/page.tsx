"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Payment } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, IconCreditCard } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { PortalPage } from "@/components/portal-page";
import { formatCents } from "@/lib/use-app-page";
import { usePortalPage } from "@/lib/use-portal-page";

function paymentTone(status: string): "success" | "warning" | "default" {
  if (status === "received") return "success";
  if (status === "pending") return "warning";
  return "default";
}

export default function PortalPaymentsPage() {
  const t = useTranslations("modules.portal.payments");
  const tc = useTranslations("modules.common");
  const tErr = useTranslations("common");
  const { customer, client } = usePortalPage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .listPortalPayments()
      .then((r) => setPayments(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [client]);

  async function handlePay(invoiceId: string) {
    setError("");
    setPayingId(invoiceId);
    try {
      const intent = await client.createPortalPaymentIntent(invoiceId);
      if (intent.mock) {
        await client.confirmPortalPayment(invoiceId);
      }
      const refreshed = await client.listPortalPayments();
      setPayments(refreshed.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr("error"));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <PortalPage
      title={t("title")}
      subtitle={customer ? t("subtitle", { name: customer.name }) : t("loadingSubtitle")}
    >
      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{tc("loading")}</p>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconCreditCard size={28} className="text-[var(--brand-text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
              <p className="mt-2 max-w-md text-sm text-[var(--brand-text-secondary)]">
                {t("emptyDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((pay, i) => (
            <Card
              key={pay.id}
              className="list-item-card stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">
                    {pay.invoice_number ?? t("paymentLabel", { id: pay.id.slice(0, 8) })}
                  </div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {formatCents(pay.amount_cents)}
                  </div>
                  {pay.paid_at ? (
                    <div className="text-xs text-[var(--brand-text-muted)]">
                      {t("paidAt", { date: new Date(pay.paid_at).toLocaleDateString() })}
                    </div>
                  ) : pay.created_at ? (
                    <div className="text-xs text-[var(--brand-text-muted)]">
                      {t("createdAt", { date: new Date(pay.created_at).toLocaleDateString() })}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {pay.method ? (
                    <span className="text-xs text-[var(--brand-text-muted)]">{pay.method}</span>
                  ) : null}
                  <Badge tone={paymentTone(pay.status)}>{t(`status.${pay.status}`)}</Badge>
                  {pay.status === "pending" && pay.invoice_id ? (
                    <Button
                      size="sm"
                      disabled={payingId === pay.invoice_id}
                      onClick={() => handlePay(pay.invoice_id!)}
                    >
                      {payingId === pay.invoice_id ? tc("loading") : t("payNow")}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-[var(--brand-text-muted)]">{t("mockHint")}</p>
    </PortalPage>
  );
}
