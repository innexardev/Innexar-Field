"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Customer } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
import { useAppPage } from "@/lib/use-app-page";
import {
  estimateWizardStepPath,
  loadEstimateWizardDraft,
  saveEstimateWizardDraft,
} from "@/lib/estimating/wizard-steps";

export default function EstimateNewDetailsPage() {
  const router = useRouter();
  const { client, token } = useAppPage();
  const t = useTranslations("modules.estimates");
  const tc = useTranslations("modules.common");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");

  useEffect(() => {
    const draft = loadEstimateWizardDraft();
    setTitle(draft.title);
    setCustomerId(draft.customerId);
  }, []);

  useEffect(() => {
    if (token) client.listCustomers().then((r) => setCustomers(r.data ?? [])).catch(console.error);
  }, [token, client]);

  function onContinue() {
    if (!title.trim()) return;
    saveEstimateWizardDraft({
      ...loadEstimateWizardDraft(),
      title: title.trim(),
      customerId,
    });
    router.push(estimateWizardStepPath("lines"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detailsTitle")}</CardTitle>
        <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("detailsDescription")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="form-field">
          <label className="form-label" htmlFor="est-title">
            {tc("title")}
          </label>
          <Input
            id="est-title"
            placeholder={t("titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="est-customer">
            {t("customerOptional")}
          </label>
          <select
            id="est-customer"
            className="form-select w-full"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">{t("noCustomerSelected")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="form-hint">{t("customerHint")}</p>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onContinue} disabled={!title.trim()}>
            {tc("continueToLineItems")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
