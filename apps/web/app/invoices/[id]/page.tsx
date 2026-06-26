"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Invoice } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.invoiceDetail");
  const tc = useTranslations("modules.common");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

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

  async function sendInvoice() {
    if (!invoice) return;
    setActing(true);
    try {
      const updated = await client.sendInvoice(invoice.id);
      setInvoice(updated);
    } finally {
      setActing(false);
    }
  }

  async function payInvoice() {
    if (!invoice) return;
    setActing(true);
    try {
      await client.payInvoice(invoice.id);
      await load();
    } finally {
      setActing(false);
    }
  }

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

  return (
    <ModulePage title={invoice.invoice_number} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/invoices" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("allInvoices")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={invoice.status === "paid" ? "success" : invoice.status === "sent" ? "warning" : "default"}>
            {invoice.status}
          </Badge>
          {invoice.status === "draft" && (
            <Button onClick={sendInvoice} disabled={acting}>
              {acting ? "Sending…" : "Send invoice"}
            </Button>
          )}
          {invoice.status === "sent" && (
            <Button onClick={payInvoice} disabled={acting}>
              {acting ? "Processing…" : "Record payment"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-[var(--brand-border)] pb-3">
              <span className="text-[var(--brand-text-muted)]">Invoice number</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            {invoice.customer_id && (
              <div className="flex justify-between border-b border-[var(--brand-border)] pb-3">
                <span className="text-[var(--brand-text-muted)]">Customer</span>
                <Link href={`/customers/${invoice.customer_id}`} className="text-[var(--brand-accent)] hover:underline">
                  View customer
                </Link>
              </div>
            )}
            {invoice.due_at && (
              <div className="flex justify-between border-b border-[var(--brand-border)] pb-3">
                <span className="text-[var(--brand-text-muted)]">Due date</span>
                <span>{new Date(invoice.due_at).toLocaleDateString("en-US")}</span>
              </div>
            )}
            {invoice.paid_at && (
              <div className="flex justify-between">
                <span className="text-[var(--brand-text-muted)]">Paid on</span>
                <span>{new Date(invoice.paid_at).toLocaleDateString("en-US")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amount due</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-[var(--brand-text-primary)]">
              {formatCents(invoice.total_cents)}
            </p>
            {invoice.status === "sent" && (
              <Button onClick={payInvoice} disabled={acting} className="mt-4 w-full">
                {acting ? "Processing…" : "Pay invoice"}
              </Button>
            )}
            {invoice.status === "paid" && (
              <p className="mt-3 text-sm text-[var(--brand-success)]">Payment recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
