"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Invoice } from "@fieldforge/sdk";
import { Badge, BrandLogo, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";
import { useBrand } from "@/components/brand-provider";

export default function InvoicePreviewPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { client, token } = useAppPage();
  const brand = useBrand();
  const t = useTranslations("modules.invoices");
  const tc = useTranslations("modules.common");
  const td = useTranslations("modules.invoiceDetail");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !params.id) return;
    const inv = await client.getInvoice(params.id);
    setInvoice(inv);
  }, [token, client, params.id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (searchParams.get("print") === "1" && !loading && invoice) {
      window.print();
    }
  }, [searchParams, loading, invoice]);

  if (loading) {
    return (
      <ModulePage title={tc("invoice")} subtitle={tc("loading")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!invoice) {
    return (
      <ModulePage title={tc("invoice")} subtitle={tc("notFound")}>
        <Link href="/invoices" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToInvoices")}
        </Link>
      </ModulePage>
    );
  }

  const statusTone =
    invoice.status === "paid" ? "success" : invoice.status === "sent" ? "warning" : "default";

  return (
    <ModulePage
      title={invoice.invoice_number}
      subtitle={t("previewSubtitle")}
      actions={
        <div className="quote-preview-actions flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            {t("printInvoice")}
          </Button>
          <Link href={`/invoices/${invoice.id}`}>
            <Button variant="secondary">{tc("backToInvoice")}</Button>
          </Link>
        </div>
      }
    >
      <div className="quote-preview mb-6">
        <Card className="shadow-lg">
          <CardHeader className="border-b border-[var(--brand-border)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <BrandLogo src={brand.logo.wordmark} alt={brand.name} height={32} />
                <p className="mt-3 text-xs font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
                  {brand.legal_name || brand.name}
                </p>
                <CardTitle className="mt-1 text-2xl">{invoice.invoice_number}</CardTitle>
              </div>
              <Badge tone={statusTone}>{invoice.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {invoice.due_at && (
                <div className="rounded-xl border border-[var(--brand-border)] px-4 py-3">
                  <p className="text-[var(--brand-text-muted)]">{td("dueDate")}</p>
                  <p className="mt-1 font-medium">{new Date(invoice.due_at).toLocaleDateString()}</p>
                </div>
              )}
              {invoice.paid_at && (
                <div className="rounded-xl border border-[var(--brand-border)] px-4 py-3">
                  <p className="text-[var(--brand-text-muted)]">{td("paidOn")}</p>
                  <p className="mt-1 font-medium">{new Date(invoice.paid_at).toLocaleDateString()}</p>
                </div>
              )}
              {invoice.customer_id && (
                <div className="rounded-xl border border-[var(--brand-border)] px-4 py-3">
                  <p className="text-[var(--brand-text-muted)]">{tc("customer")}</p>
                  <Link
                    href={`/customers/${invoice.customer_id}`}
                    className="mt-1 inline-block font-medium text-[var(--brand-accent)] hover:underline"
                  >
                    {tc("viewCustomer")}
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[var(--brand-surface-elevated)] p-5">
              <div className="flex justify-between border-t border-[var(--brand-border)] pt-3 text-lg font-semibold">
                <span>{invoice.status === "paid" ? td("amountPaid") : td("amountDue")}</span>
                <span>{formatCents(invoice.total_cents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
