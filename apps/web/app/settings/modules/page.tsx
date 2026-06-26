"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { CORE_MODULES, MODULE_META } from "@/lib/onboarding/modules";
import { useAppPage } from "@/lib/use-app-page";
import { useAuth } from "@/lib/auth-context";

export default function SettingsModulesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.settingsModules");
  const tc = useTranslations("modules.common");
  const { refreshNav } = useAuth();
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const preview = await client.previewOnboardingModules();
    const record: Record<string, boolean> = {};
    for (const m of preview.data) record[m.id] = m.enabled;
    setModules(record);
  }, [client, token]);

  useEffect(() => {
    void load().catch(console.error);
  }, [load]);

  const moduleList = useMemo(() => {
    const ids = new Set([...CORE_MODULES, ...Object.keys(modules)]);
    return Array.from(ids).map((id) => ({
      id,
      label: MODULE_META[id]?.label ?? id,
      description: MODULE_META[id]?.description ?? "Plugin module",
      enabled: modules[id] ?? false,
      core: (CORE_MODULES as readonly string[]).includes(id),
    }));
  }, [modules]);

  const enabledCount = moduleList.filter((m) => m.enabled).length;

  function toggleModule(id: string, core?: boolean) {
    if (core) return;
    setModules((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    try {
      const enabled = Object.entries(modules)
        .filter(([, on]) => on)
        .map(([id]) => id);
      await client.updateOnboardingModules(enabled);
      await refreshNav();
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Workspace modules</CardTitle>
              <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                {enabledCount} module{enabledCount !== 1 ? "s" : ""} enabled
              </p>
            </div>
            {saved && <Badge tone="success">Saved</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {moduleList.map((mod, i) => (
            <div
              key={mod.id}
              className={`onboarding-module-row stagger-item${mod.enabled ? "" : " onboarding-module-row--off"}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--brand-text-primary)]">{mod.label}</span>
                  {mod.core && <Badge>Core</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-[var(--brand-text-secondary)]">{mod.description}</p>
              </div>
              <label className="onboarding-toggle">
                <input
                  type="checkbox"
                  checked={mod.enabled}
                  disabled={mod.core}
                  onChange={() => toggleModule(mod.id, mod.core)}
                  aria-label={`Toggle ${mod.label}`}
                />
                <span className="onboarding-toggle__track" />
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <a
          href="/marketplace"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[color-mix(in_srgb,var(--brand-accent)_35%,var(--brand-border))]"
        >
          Browse marketplace
        </a>
      </div>
    </ModulePage>
  );
}
