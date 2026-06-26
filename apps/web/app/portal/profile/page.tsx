"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { PortalPage } from "@/components/portal-page";
import { usePortalAuth } from "@/lib/portal-auth-context";
import { usePortalPage } from "@/lib/use-portal-page";

export default function PortalProfilePage() {
  const t = useTranslations("modules.portal.profile");
  const tc = useTranslations("modules.common");
  const tErr = useTranslations("common");
  const { customer, client } = usePortalPage();
  const { setCustomer } = usePortalAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setEmail(customer.email ?? "");
      setPhone(customer.phone ?? "");
    }
  }, [customer]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const updated = await client.updatePortalProfile({ name, email, phone });
      setCustomer(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalPage
      title={t("title")}
      subtitle={customer ? t("subtitle", { company: customer.company_name ?? "" }) : t("loadingSubtitle")}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("formHint")}</p>
        </CardHeader>
        <CardContent>
          <ErrorBanner message={error} />
          <form onSubmit={onSubmit} className="max-w-md space-y-4">
            <div className="form-field">
              <label className="form-label" htmlFor="portal-name">
                {t("name")}
              </label>
              <Input
                id="portal-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="portal-email">
                {tc("email")}
              </label>
              <Input
                id="portal-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="portal-phone">
                {t("phone")}
              </label>
              <Input
                id="portal-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("saving") : t("save")}
              </Button>
              {saved ? (
                <span className="text-sm text-[var(--brand-success)]">{t("saved")}</span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </PortalPage>
  );
}
