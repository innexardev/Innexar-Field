"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Badge } from "@fieldforge/ui";
import {
  formatErrorForUser,
  type IntegrationBlock,
  type MaskedSecret,
  type PlatformIntegrationsSettings,
} from "@fieldforge/sdk";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

function isMaskedSecret(value: unknown): value is MaskedSecret {
  return typeof value === "object" && value !== null && "set" in value;
}

function boolVal(block: IntegrationBlock, key: string) {
  const v = block[key];
  return v === true || v === "true";
}

function credentialsReady(block: IntegrationBlock): boolean {
  const idSet = isMaskedSecret(block.client_id) && block.client_id.set;
  const secretSet = isMaskedSecret(block.client_secret) && block.client_secret.set;
  return idSet && secretSet;
}

function strField(block: IntegrationBlock, key: string) {
  const v = block[key];
  return typeof v === "string" ? v : "";
}

function SectionHelp({ text }: { text: string }) {
  return (
    <p className="mb-4 rounded-lg border border-[color-mix(in_srgb,var(--brand-accent)_18%,var(--brand-border))] bg-[var(--brand-info-subtle)] px-4 py-3 text-sm leading-relaxed text-[var(--brand-text-secondary)]">
      {text}
    </p>
  );
}

function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--brand-border)] px-4 py-3">
      <span className="text-sm font-medium text-[var(--brand-text-primary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 rounded-full transition ${
          enabled ? "bg-[var(--brand-accent)]" : "bg-[var(--brand-border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            enabled ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function SecretField({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <p className="mb-1 text-xs text-[var(--brand-text-muted)]">{hint}</p>
      <Input
        type="password"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

type Draft = {
  stripe: Record<string, string>;
  quickbooks: Record<string, string>;
  avalara: Record<string, string>;
  smtp: Record<string, string>;
  storage: Record<string, string>;
};

const emptyDraft = (): Draft => ({
  stripe: {},
  quickbooks: {},
  avalara: {},
  smtp: {},
  storage: {},
});

export default function IntegrationsPage() {
  const { client } = useAdminPage();
  const t = useTranslations("admin.pages.integrations");
  const tc = useTranslations("admin.common");
  const [settings, setSettings] = useState<PlatformIntegrationsSettings | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function maskedHint(value: unknown) {
    if (!isMaskedSecret(value) || !value.set) return t("notConfigured");
    return t("configuredHint", { last4: value.last4 ?? "" });
  }

  function quickBooksStatus(block: IntegrationBlock): { label: string; tone: "success" | "warning" | "default" } {
    if (!boolVal(block, "enabled")) {
      return { label: t("statusDisabled"), tone: "default" };
    }
    if (credentialsReady(block)) {
      return { label: t("statusReady"), tone: "success" };
    }
    return { label: t("statusNeedsCredentials"), tone: "warning" };
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await client.getIntegrationsSettings();
      setSettings(data);
      setDraft(emptyDraft());
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function patchDraft(section: keyof Draft, key: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  function patchEnabled(section: keyof Draft, enabled: boolean) {
    const value = enabled ? "true" : "false";
    setDraft((prev) => ({
      ...prev,
      [section]: { ...prev[section], enabled: value },
    }));
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            [section]: { ...prev[section], enabled },
          }
        : prev,
    );
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload: Draft = emptyDraft();
      for (const section of Object.keys(draft) as (keyof Draft)[]) {
        const entries = Object.entries(draft[section]).filter(([, v]) => v !== "");
        if (entries.length > 0) {
          payload[section] = Object.fromEntries(entries);
        }
      }
      const updated = await client.updateIntegrationsSettings(payload);
      setSettings(updated);
      setDraft(emptyDraft());
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  const stripe = settings?.stripe ?? {};
  const quickbooks = settings?.quickbooks ?? {};
  const avalara = settings?.avalara ?? {};
  const smtp = settings?.smtp ?? {};
  const storage = settings?.storage ?? {};
  const qbStatus = quickBooksStatus(quickbooks);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? tc("saving") : t("saveChanges")}
          </Button>
        }
      />
      <ErrorBanner message={error} className="mb-4" />
      <SectionHelp text={t("helpIntro")} />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("loading")}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 lg:col-span-2">
            <h2 className="mb-2 text-lg font-semibold text-[var(--brand-text-primary)]">{t("stripe.title")}</h2>
            <SectionHelp text={t("stripe.help")} />
            <div className="grid gap-4 md:grid-cols-2">
              <SecretField
                label={t("stripe.secretKey")}
                hint={maskedHint(stripe.secret_key)}
                placeholder={t("enterNewValue")}
                value={draft.stripe.secret_key ?? ""}
                onChange={(v) => patchDraft("stripe", "secret_key", v)}
              />
              <SecretField
                label={t("stripe.publishableKey")}
                hint={maskedHint(stripe.publishable_key)}
                placeholder={t("enterNewValue")}
                value={draft.stripe.publishable_key ?? ""}
                onChange={(v) => patchDraft("stripe", "publishable_key", v)}
              />
              <SecretField
                label={t("stripe.webhookSecret")}
                hint={maskedHint(stripe.webhook_secret)}
                placeholder={t("enterNewValue")}
                value={draft.stripe.webhook_secret ?? ""}
                onChange={(v) => patchDraft("stripe", "webhook_secret", v)}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--brand-text-primary)]">{t("quickbooks.title")}</h2>
              {!loading && <Badge tone={qbStatus.tone}>{qbStatus.label}</Badge>}
            </div>
            <SectionHelp text={t("quickbooks.help")} />
            <div className="mb-4">
              <Toggle
                label={t("enabled")}
                enabled={boolVal(quickbooks, "enabled")}
                onChange={(v) => patchEnabled("quickbooks", v)}
              />
            </div>
            <SecretField
              label={t("quickbooks.clientId")}
              hint={maskedHint(quickbooks.client_id)}
              placeholder={t("enterNewValue")}
              value={draft.quickbooks.client_id ?? ""}
              onChange={(v) => patchDraft("quickbooks", "client_id", v)}
            />
            <SecretField
              label={t("quickbooks.clientSecret")}
              hint={maskedHint(quickbooks.client_secret)}
              placeholder={t("enterNewValue")}
              value={draft.quickbooks.client_secret ?? ""}
              onChange={(v) => patchDraft("quickbooks", "client_secret", v)}
            />
          </section>

          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-2 text-lg font-semibold text-[var(--brand-text-primary)]">{t("avalara.title")}</h2>
            <SectionHelp text={t("avalara.help")} />
            <div className="mb-4">
              <Toggle
                label={t("enabled")}
                enabled={boolVal(avalara, "enabled")}
                onChange={(v) => patchEnabled("avalara", v)}
              />
            </div>
            <SecretField
              label={t("avalara.accountId")}
              hint={maskedHint(avalara.account_id)}
              placeholder={t("enterNewValue")}
              value={draft.avalara.account_id ?? ""}
              onChange={(v) => patchDraft("avalara", "account_id", v)}
            />
            <SecretField
              label={t("avalara.licenseKey")}
              hint={maskedHint(avalara.license_key)}
              placeholder={t("enterNewValue")}
              value={draft.avalara.license_key ?? ""}
              onChange={(v) => patchDraft("avalara", "license_key", v)}
            />
          </section>

          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-2 text-lg font-semibold text-[var(--brand-text-primary)]">{t("smtp.title")}</h2>
            <SectionHelp text={t("smtp.help")} />
            <div className="mb-4">
              <Toggle
                label={t("enabled")}
                enabled={boolVal(smtp, "enabled")}
                onChange={(v) => patchEnabled("smtp", v)}
              />
            </div>
            <TextField
              label={t("smtp.host")}
              value={draft.smtp.host ?? strField(smtp, "host")}
              onChange={(v) => patchDraft("smtp", "host", v)}
            />
            <TextField
              label={t("smtp.port")}
              value={draft.smtp.port ?? strField(smtp, "port")}
              onChange={(v) => patchDraft("smtp", "port", v)}
            />
            <TextField
              label={t("smtp.username")}
              value={draft.smtp.username ?? strField(smtp, "username")}
              onChange={(v) => patchDraft("smtp", "username", v)}
            />
            <SecretField
              label={t("smtp.password")}
              hint={maskedHint(smtp.password)}
              placeholder={t("enterNewValue")}
              value={draft.smtp.password ?? ""}
              onChange={(v) => patchDraft("smtp", "password", v)}
            />
            <TextField
              label={t("smtp.fromEmail")}
              type="email"
              value={draft.smtp.from_email ?? strField(smtp, "from_email")}
              onChange={(v) => patchDraft("smtp", "from_email", v)}
            />
          </section>

          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-2 text-lg font-semibold text-[var(--brand-text-primary)]">{t("storage.title")}</h2>
            <SectionHelp text={t("storage.help")} />
            <div className="mb-4">
              <Toggle
                label={t("enabled")}
                enabled={boolVal(storage, "enabled")}
                onChange={(v) => patchEnabled("storage", v)}
              />
            </div>
            <TextField
              label={t("storage.accountId")}
              value={draft.storage.account_id ?? strField(storage, "account_id")}
              onChange={(v) => patchDraft("storage", "account_id", v)}
            />
            <SecretField
              label={t("storage.accessKeyId")}
              hint={maskedHint(storage.access_key_id)}
              placeholder={t("enterNewValue")}
              value={draft.storage.access_key_id ?? ""}
              onChange={(v) => patchDraft("storage", "access_key_id", v)}
            />
            <SecretField
              label={t("storage.secretAccessKey")}
              hint={maskedHint(storage.secret_access_key)}
              placeholder={t("enterNewValue")}
              value={draft.storage.secret_access_key ?? ""}
              onChange={(v) => patchDraft("storage", "secret_access_key", v)}
            />
            <TextField
              label={t("storage.bucket")}
              value={draft.storage.bucket ?? strField(storage, "bucket")}
              onChange={(v) => patchDraft("storage", "bucket", v)}
            />
            <TextField
              label={t("storage.publicUrl")}
              value={draft.storage.public_url ?? strField(storage, "public_url")}
              onChange={(v) => patchDraft("storage", "public_url", v)}
            />
          </section>

          {settings && (
            <p className="text-xs text-[var(--brand-text-muted)] lg:col-span-2">
              {t("lastUpdated", { date: new Date(settings.updated_at).toLocaleString() })}
            </p>
          )}
        </div>
      )}
    </>
  );
}
