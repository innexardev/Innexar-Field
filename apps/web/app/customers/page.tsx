"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Customer } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, IconUsers } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function CustomersPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.customers");
  const tc = useTranslations("modules.common");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (token) client.listCustomers().then((r) => setCustomers(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    const c = await client.createCustomer({ name, email });
    setCustomers((prev) => [c, ...prev]);
    setName("");
    setEmail("");
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>{t("addTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("addDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={addCustomer} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="customer-name">{tc("name")}</label>
              <Input
                id="customer-name"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="customer-email">{tc("email")}</label>
              <Input
                id="customer-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="sm:mb-0.5">{t("addCustomer")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4 border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))] bg-[var(--brand-info-subtle)]">
        <CardContent className="py-4">
          <p className="text-sm text-[var(--brand-text-secondary)]">
            {t.rich("afterCreateHint", {
              view: (chunks) => <strong className="text-[var(--brand-text-primary)]">{chunks}</strong>,
            })}
          </p>
        </CardContent>
      </Card>

      <div className="mt-8">
        {customers.length === 0 ? (
          <div className="empty-state stagger-item">
            <div className="empty-state-icon" aria-hidden>
              <IconUsers size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--brand-text-primary)]">{t("emptyTitle")}</h3>
            <p className="mt-2 max-w-sm text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--brand-text-muted)]">
              {tc("customerCount", { count: customers.length })}
            </p>
            {customers.map((c, i) => (
              <Card
                key={c.id}
                className="list-item-card stagger-item transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))]"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-sm font-semibold text-[var(--brand-accent)]">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--brand-text-primary)]">{c.name}</div>
                      {c.email && (
                        <div className="truncate text-sm text-[var(--brand-text-secondary)]">{c.email}</div>
                      )}
                    </div>
                  </div>
                  <Link href={`/customers/${c.id}`} className="shrink-0">
                    <Button variant="secondary" size="sm">
                      {t("viewAndEdit")}
                      <IconArrowRight />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModulePage>
  );
}
