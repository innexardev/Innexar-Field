"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Customer, Invoice } from "@fieldforge/sdk";
import { Badge, Card, CardContent, IconReceipt } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function CustomerInvoicesPage() {
  const params = useParams<{ id: string }>();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.customerInvoices");
  const tc = useTranslations("modules.common");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !params.id) return;
    const id = params.id;
    Promise.all([client.getCustomer(id), client.listInvoices()])
      .then(([c, invRes]) => {
        setCustomer(c);
        setInvoices(invRes.data.filter((i) => i.customer_id === id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client, params.id]);

  if (loading) {
    return (
      <ModulePage title={tc("invoice")} subtitle={tc("loadingBillingHistory")}>
        <p className="text-sm text-[var(--brand-text-muted)]">{tc("loading")}</p>
      </ModulePage>
    );
  }

  if (!customer) {
    return (
      <ModulePage title={tc("invoice")} subtitle={tc("customerNotFound")}>
        <Link href="/customers" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToCustomers")}
        </Link>
      </ModulePage>
    );
  }

  return (
    <ModulePage title={tc("titleWithSuffix", { name: customer.name, suffix: t("suffix") })} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href={`/customers/${customer.id}`} className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("customerProfile")}
        </Link>
        <Link
          href="/invoices"
          className="inline-flex items-center rounded-lg bg-[var(--brand-accent)] px-3 py-1.5 text-xs font-medium text-[var(--brand-accent-foreground)]"
        >
          New invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconReceipt size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">No invoices yet</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
            Bill completed work or create an invoice manually from the invoicing module.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv, i) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
              <Card
                className="list-item-card stagger-item transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <div className="font-medium">{inv.invoice_number}</div>
                    <div className="text-sm text-[var(--brand-text-secondary)]">{formatCents(inv.total_cents)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={inv.status === "paid" ? "success" : "default"}>{inv.status}</Badge>
                    <span className="text-sm text-[var(--brand-accent)]">View →</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
