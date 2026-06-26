"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Invoice } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, IconReceipt } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function InvoicesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.invoices");
  const tc = useTranslations("modules.common");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) client.listInvoices().then((r) => setInvoices(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function createInvoice() {
    setCreating(true);
    try {
      const inv = await client.createInvoice({ total_cents: 25000 });
      setInvoices((prev) => [inv, ...prev]);
    } finally {
      setCreating(false);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>{t("newTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("newDescription")}</p>
        </CardHeader>
        <CardContent>
          <Button onClick={createInvoice} disabled={creating}>
            {creating ? tc("creating") : t("createInvoice")}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconReceipt size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          invoices.map((inv, i) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
              <Card className="list-item-card stagger-item transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))]" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <div className="font-medium">{inv.invoice_number}</div>
                    <div className="text-sm text-[var(--brand-text-secondary)]">{formatCents(inv.total_cents)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={inv.status === "paid" ? "success" : "default"}>{inv.status}</Badge>
                    <span className="text-sm text-[var(--brand-accent)]">{tc("viewArrow")}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </ModulePage>
  );
}
