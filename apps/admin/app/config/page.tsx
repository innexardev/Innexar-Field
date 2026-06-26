"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformConfig } from "@fieldforge/sdk";
import { AdminPage } from "@/components/admin-shell";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import {
  DEFAULT_COLORS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_LOGO_URL,
  DEFAULT_SUPPORT_EMAIL,
} from "@/lib/defaults";
import { useAdminPage } from "@/lib/use-admin-page";

function strVal(overrides: Record<string, unknown>, key: string, fallback: string) {
  const v = overrides[key];
  return typeof v === "string" ? v : fallback;
}

export default function ConfigPage() {
  const { client } = useAdminPage();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primary);
  const [accentColor, setAccentColor] = useState(DEFAULT_COLORS.accent);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);
  const [flags, setFlags] = useState<Record<string, boolean>>({ ...DEFAULT_FEATURE_FLAGS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const cfg = await client.getConfig();
      setConfig(cfg);
      const brand = cfg.brand_overrides;
      setPrimaryColor(strVal(brand, "primary_color", DEFAULT_COLORS.primary));
      setAccentColor(strVal(brand, "accent_color", DEFAULT_COLORS.accent));
      setLogoUrl(strVal(brand, "logo_url", DEFAULT_LOGO_URL));
      setSupportEmail(strVal(brand, "support_email", DEFAULT_SUPPORT_EMAIL));
      setFlags({ ...DEFAULT_FEATURE_FLAGS, ...cfg.feature_flags });
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await client.updateConfig({
        brand_overrides: {
          primary_color: primaryColor,
          accent_color: accentColor,
          logo_url: logoUrl,
          support_email: supportEmail,
        },
        feature_flags: flags,
      });
      setConfig(updated);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  function toggleFlag(key: string) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <AdminPage>
      <PageHeader
        title="Global config"
        subtitle="Brand overrides and feature flags applied platform-wide."
        actions={
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading config…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--brand-text-primary)]">Brand</h2>
            <div className="form-field">
              <label className="form-label">Primary color</label>
              <div className="flex gap-2">
                <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-14 p-1" />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Accent color</label>
              <div className="flex gap-2">
                <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-14 p-1" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Logo URL</label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Support email</label>
              <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
            {config && (
              <p className="text-xs text-[var(--brand-text-muted)]">
                Last updated {new Date(config.updated_at).toLocaleString()}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--brand-text-primary)]">Feature flags</h2>
            <div className="space-y-3">
              {Object.entries(flags).map(([key, enabled]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--brand-border)] px-4 py-3"
                >
                  <span className="text-sm font-medium text-[var(--brand-text-primary)]">{key}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => toggleFlag(key)}
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
              ))}
            </div>
          </section>
        </div>
      )}
    </AdminPage>
  );
}
