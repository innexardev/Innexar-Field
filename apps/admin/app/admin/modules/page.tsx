"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@fieldforge/ui";
import { formatErrorForUser, type PlatformModuleSettings } from "@fieldforge/sdk";
import { ErrorBanner } from "@/components/error-banner";
import { PageHeader } from "@/components/page-header";
import { useAdminPage } from "@/lib/use-admin-page";

function Toggle({
  label,
  description,
  enabled,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between rounded-lg border border-[var(--brand-border)] px-4 py-3 ${
        disabled ? "opacity-60" : "cursor-pointer"
      }`}
    >
      <div>
        <span className="text-sm font-medium text-[var(--brand-text-primary)]">{label}</span>
        {description && (
          <p className="text-xs text-[var(--brand-text-muted)]">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
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

export default function ModulesPage() {
  const { client } = useAdminPage();
  const [settings, setSettings] = useState<PlatformModuleSettings | null>(null);
  const [globallyEnabled, setGloballyEnabled] = useState<Record<string, boolean>>({});
  const [packDefaults, setPackDefaults] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedPack, setSelectedPack] = useState("cleaning");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await client.getModuleSettings();
      setSettings(data);
      setGloballyEnabled({ ...data.globally_enabled });
      setPackDefaults(JSON.parse(JSON.stringify(data.pack_defaults)) as Record<string, Record<string, boolean>>);
      if (data.industry_packs.length > 0 && !data.industry_packs.find((p) => p.id === selectedPack)) {
        setSelectedPack(data.industry_packs[0]?.id ?? "cleaning");
      }
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client, selectedPack]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await client.updateModuleSettings({
        globally_enabled: globallyEnabled,
        pack_defaults: packDefaults,
      });
      setSettings(updated);
      setGloballyEnabled({ ...updated.globally_enabled });
      setPackDefaults(JSON.parse(JSON.stringify(updated.pack_defaults)) as Record<string, Record<string, boolean>>);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setSaving(false);
    }
  }

  function toggleGlobal(moduleId: string, core: boolean) {
    if (core) return;
    setGloballyEnabled((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }

  function togglePackDefault(moduleId: string) {
    setPackDefaults((prev) => ({
      ...prev,
      [selectedPack]: {
        ...prev[selectedPack],
        [moduleId]: !prev[selectedPack]?.[moduleId],
      },
    }));
  }

  const packMods = packDefaults[selectedPack] ?? {};

  return (
    <>
      <PageHeader
        title="Modules"
        subtitle="Enable or disable plugins platform-wide and set per-industry-pack defaults for new tenants."
        actions={
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />
      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading module catalog…</p>
      ) : settings ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-1 text-lg font-semibold text-[var(--brand-text-primary)]">Global catalog</h2>
            <p className="mb-4 text-sm text-[var(--brand-text-secondary)]">
              Disabled modules are hidden from onboarding and cannot be enabled by tenants.
            </p>
            <div className="space-y-2">
              {settings.catalog.map((mod) => (
                <div key={mod.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--brand-border)] px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{mod.name}</span>
                      {mod.core && <Badge tone="success">Core</Badge>}
                      {!globallyEnabled[mod.id] && <Badge tone="default">Off</Badge>}
                    </div>
                    {mod.description && (
                      <p className="text-xs text-[var(--brand-text-muted)]">{mod.description}</p>
                    )}
                    {mod.industry_packs && mod.industry_packs.length > 0 && (
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                        Packs: {mod.industry_packs.join(", ")}
                      </p>
                    )}
                  </div>
                  <Toggle
                    label=""
                    enabled={globallyEnabled[mod.id] ?? true}
                    disabled={mod.core}
                    onChange={() => toggleGlobal(mod.id, mod.core)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
            <h2 className="mb-1 text-lg font-semibold text-[var(--brand-text-primary)]">Pack defaults</h2>
            <p className="mb-4 text-sm text-[var(--brand-text-secondary)]">
              Default modules provisioned when a tenant selects an industry pack during onboarding.
            </p>
            <div className="form-field mb-4">
              <label className="form-label">Industry pack</label>
              <select
                className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                value={selectedPack}
                onChange={(e) => setSelectedPack(e.target.value)}
              >
                {settings.industry_packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {settings.catalog
                .filter((mod) => globallyEnabled[mod.id] !== false)
                .map((mod) => (
                  <Toggle
                    key={mod.id}
                    label={mod.name}
                    description={mod.core ? "Core module" : undefined}
                    enabled={packMods[mod.id] ?? false}
                    disabled={mod.core}
                    onChange={() => togglePackDefault(mod.id)}
                  />
                ))}
            </div>
            {settings.updated_at && (
              <p className="mt-4 text-xs text-[var(--brand-text-muted)]">
                Last updated {new Date(settings.updated_at).toLocaleString()}
              </p>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
