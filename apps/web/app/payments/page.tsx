"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Payment } from "@fieldforge/sdk";
import { Badge, Card, CardContent, CardHeader, CardTitle, IconCreditCard } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

export default function PaymentsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.payments");
  const tc = useTranslations("modules.common");
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (token) client.listPayments().then((r) => setPayments(r.data ?? [])).catch(console.error);
  }, [token, client]);

  const received = useMemo(() => payments.filter((p) => p.status === "received"), [payments]);
  const pending = useMemo(() => payments.filter((p) => p.status === "pending"), [payments]);

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      {payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconCreditCard size={28} className="text-[var(--brand-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Received</CardTitle>
                <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                  {received.length} payment{received.length !== 1 ? "s" : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {received.length === 0 ? (
                  <p className="text-sm text-[var(--brand-text-muted)]">No received payments.</p>
                ) : (
                  received.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-[var(--brand-surface-elevated)] px-3 py-3 stagger-item"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div>
                        <div className="font-medium">{p.invoice_number ?? p.id}</div>
                        <div className="text-xs text-[var(--brand-text-muted)]">
                          {p.method?.toUpperCase() ?? "Payment"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-[var(--brand-success)]">{formatCents(p.amount_cents)}</div>
                        <Badge tone="success">Received</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Pending</CardTitle>
                <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                  {pending.length} awaiting payment
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {pending.length === 0 ? (
                  <p className="text-sm text-[var(--brand-text-muted)]">No pending payments.</p>
                ) : (
                  pending.map((p, i) => (
                    <Link key={p.id} href={p.invoice_id ? `/invoices/${p.invoice_id}` : "#"} className="block">
                      <div
                        className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] px-3 py-3 transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))] stagger-item"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div>
                          <div className="font-medium">{p.invoice_number ?? p.id}</div>
                          <div className="text-xs text-[var(--brand-text-muted)]">
                            {p.method?.toUpperCase() ?? "Awaiting"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCents(p.amount_cents)}</div>
                          <Badge tone="warning">Pending</Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </ModulePage>
  );
}
