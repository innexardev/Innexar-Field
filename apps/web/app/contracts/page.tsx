"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Contract, ContractTemplate, Customer } from "@fieldforge/sdk";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  IconFileText,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage, formatCents } from "@/lib/use-app-page";

const textareaClassName =
  "w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-primary)] shadow-sm outline-none transition-all duration-200 placeholder:text-[var(--brand-text-muted)] hover:border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))] focus:border-[var(--brand-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 min-h-[12rem] font-mono leading-relaxed";

function statusTone(status: string): "default" | "success" | "warning" {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  return "default";
}

export default function ContractsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.contracts");
  const tc = useTranslations("modules.common");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [terms, setTerms] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    client.listContracts().then((r) => setContracts(r.data ?? [])).catch(console.error);
    client.listCustomers().then((r) => setCustomers(r.data ?? [])).catch(console.error);
    client.listContractTemplates().then((r) => setTemplates(r.data ?? [])).catch(console.error);
  }, [token, client]);

  function onTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    if (!nextTemplateId) {
      return;
    }
    const selected = templates.find((tmpl) => tmpl.id === nextTemplateId);
    if (!selected) return;
    setTitle(t(`templates.${selected.name_key}`));
    setTerms(selected.body);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (Number.isNaN(cents)) return;
    setSaving(true);
    try {
      const created = await client.createContract({
        title,
        customer_id: customerId || undefined,
        amount_cents: cents,
        terms: terms || undefined,
      });
      setContracts((prev) => [created, ...prev]);
      setTitle("");
      setCustomerId("");
      setAmount("");
      setTerms("");
      setTemplateId("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>{t("newContract")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            {t("newContractDescription")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="form-field lg:col-span-2">
                <label className="form-label" htmlFor="ctr-template">{t("startFromTemplate")}</label>
                <select
                  id="ctr-template"
                  className="form-select w-full"
                  value={templateId}
                  onChange={(e) => onTemplateChange(e.target.value)}
                >
                  <option value="">{t("noTemplate")}</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {t(`templates.${tmpl.name_key}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field lg:col-span-2">
                <label className="form-label" htmlFor="ctr-title">{tc("title")}</label>
                <Input
                  id="ctr-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Monthly janitorial — Building A"
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="ctr-customer">Customer</label>
                <select
                  id="ctr-customer"
                  className="form-select w-full"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">No customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="ctr-amount">Amount (USD)</label>
                <Input
                  id="ctr-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="4200.00"
                  required
                />
              </div>
              <div className="form-field flex items-end">
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? tc("adding") : t("addContract")}
                </Button>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="ctr-terms">{t("termsLabel")}</label>
              <textarea
                id="ctr-terms"
                className={textareaClassName}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder={t("termsHint")}
              />
              <p className="form-hint">{t("termsHint")}</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {contracts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconFileText size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          contracts.map((ctr, i) => (
            <Card key={ctr.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--brand-text-primary)]">{ctr.title}</div>
                  {ctr.customer_name && (
                    <div className="text-sm text-[var(--brand-text-secondary)]">
                      {ctr.customer_id ? (
                        <Link href={`/customers/${ctr.customer_id}`} className="hover:text-[var(--brand-accent)] hover:underline">
                          {ctr.customer_name}
                        </Link>
                      ) : (
                        ctr.customer_name
                      )}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-[var(--brand-text-muted)]">
                    {ctr.starts_at && `Starts ${ctr.starts_at}`}
                    {ctr.ends_at && ` · Ends ${ctr.ends_at}`}
                  </div>
                  {ctr.terms && (
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--brand-text-secondary)]">
                      {ctr.terms.split("\n")[0]}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCents(ctr.amount_cents)}</span>
                  <Badge tone={statusTone(ctr.status)}>{ctr.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
