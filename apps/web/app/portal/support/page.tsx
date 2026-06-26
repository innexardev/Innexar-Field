"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { PortalPage } from "@/components/portal-page";
import { usePortalPage } from "@/lib/use-portal-page";

export default function PortalSupportPage() {
  const t = useTranslations("modules.portal.support");
  const tErr = useTranslations("common");
  const { customer, client } = usePortalPage();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [referenceId, setReferenceId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setReferenceId(null);
    try {
      const created = await client.createPortalSupportRequest({ subject, message });
      setReferenceId(created.id);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalPage
      title={t("title")}
      subtitle={
        customer
          ? t("subtitle", { company: customer.company_name ?? customer.name })
          : t("loadingSubtitle")
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("formHint")}</p>
        </CardHeader>
        <CardContent>
          <ErrorBanner message={error} />
          {referenceId ? (
            <div className="mb-6 rounded-lg border border-[var(--brand-success)] bg-[var(--brand-success-subtle)] px-4 py-3 text-sm text-[var(--brand-text-primary)]">
              {t("submitted", { id: referenceId.slice(0, 8) })}
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="max-w-lg space-y-4">
            <div className="form-field">
              <label className="form-label" htmlFor="portal-support-subject">
                {t("subject")}
              </label>
              <Input
                id="portal-support-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="portal-support-message">
                {t("message")}
              </label>
              <textarea
                id="portal-support-message"
                className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-primary)] shadow-sm outline-none transition focus:border-[var(--brand-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                maxLength={4000}
              />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t("submitting") : t("submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PortalPage>
  );
}
