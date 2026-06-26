"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Invoice } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, IconReceipt } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { PortalPage } from "@/components/portal-page";
import { formatCents } from "@/lib/use-app-page";
import { usePortalPage } from "@/lib/use-portal-page";

export default function PortalInvoicesPage() {
  const t = useTranslations("modules.portal.invoices");
  const tc = useTranslations("modules.common");
  const tErr = useTranslations("common");
  const { customer, client } = usePortalPage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .listPortalInvoices()
      .then((r) => setInvoices(r.data ?? []))
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
      } else if (intent.checkout_url) {
        window.location.href = intent.checkout_url;
        return;
      }
      const refreshed = await client.listPortalInvoices();
      setInvoices(refreshed.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr("error"));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <PortalPage
      title={t("title")}
      subtitle={
        customer
          ? t("subtitle", { name: customer.name, company: customer.company_name ?? "" })
          : t("loadingSubtitle")
      }
    >
      <ErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{tc("loading")}</p>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="empty-state">
              <div className="empty-state-icon">
                <IconReceipt size={28} className="text-[var(--brand-text-muted)]" />
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
          {invoices.map((inv, i) => (
            <Card
              key={inv.id}
              className="list-item-card stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{inv.invoice_number}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">
                    {formatCents(inv.total_cents)}
                  </div>
                  {inv.due_at ? (
                    <div className="text-xs text-[var(--brand-text-muted)]">
                      {t("due", { date: new Date(inv.due_at).toLocaleDateString() })}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={inv.status === "paid" ? "success" : "default"}>{inv.status}</Badge>
                  {inv.status === "sent" ? (
                    <Button
                      size="sm"
                      disabled={payingId === inv.id}
                      onClick={() => handlePay(inv.id)}
                    >
                      {payingId === inv.id ? t("paying") : t("payNow")}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
