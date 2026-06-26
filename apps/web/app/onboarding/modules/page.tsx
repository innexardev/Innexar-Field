"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ErrorBanner } from "@/components/error-banner";
import { CORE_MODULES, MODULE_META } from "@/lib/onboarding/modules";
import { useOnboarding } from "@/lib/onboarding/use-onboarding";
import { nextStep, prevStep, stepPath } from "@/lib/onboarding/steps";

export default function OnboardingModulesPage() {
  const router = useRouter();
  const { state, packs, modulePreview, saveModules, goToStep, loadModulePreview, saving, error } =
    useOnboarding();
  const [modules, setModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (state && state.currentStep !== "modules") goToStep("modules");
  }, [state, goToStep]);

  useEffect(() => {
    void loadModulePreview();
  }, [loadModulePreview]);

  useEffect(() => {
    if (state) setModules(state.modules);
  }, [state]);

  const moduleList = useMemo(() => {
    const preview = modulePreview ?? [];
    if (preview.length > 0) {
      return preview.map((m) => ({
        id: m.id,
        label: m.name,
        description: m.description ?? "Plugin module",
        enabled: modules[m.id] ?? m.enabled,
        core: m.required,
      }));
    }
    const ids = new Set([...CORE_MODULES, ...Object.keys(modules)]);
    return Array.from(ids).map((id) => ({
      id,
      ...MODULE_META[id],
      enabled: modules[id] ?? false,
      core: CORE_MODULES.includes(id as (typeof CORE_MODULES)[number]),
    }));
  }, [modulePreview, modules]);

  const enabledCount = moduleList.filter((m) => m.enabled).length;

  function toggleModule(id: string, core?: boolean) {
    if (core) return;
    setModules((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function onBack() {
    const prev = prevStep("modules");
    if (prev) {
      goToStep(prev);
      router.push(stepPath(prev));
    }
  }

  async function onContinue() {
    if (saving) return;
    try {
      await saveModules(modules);
      const nxt = nextStep("modules");
      if (nxt) {
        goToStep(nxt);
        router.push(stepPath(nxt));
      }
    } catch {
      /* error surfaced via hook */
    }
  }

  const packNames = (state?.industryPacks ?? [])
    .map((id) => packs.find((p) => p.id === id)?.name ?? id)
    .join(", ");

  return (
    <OnboardingShell step="modules">
      <div className="onboarding-content">
        <header className="onboarding-page-header">
          <h1 className="onboarding-title">Review your modules</h1>
          <p className="onboarding-subtitle">
            Pre-selected for {packNames || "your industry"}. Core modules are always included — toggle optional
            add-ons before we provision your workspace.
          </p>
        </header>

        <ErrorBanner message={error} className="mb-4" />

        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Module preview</CardTitle>
                <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
                  {enabledCount} module{enabledCount !== 1 ? "s" : ""} will be activated
                </p>
              </div>
              <Badge tone="success">Auto-provisioned</Badge>
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
                    <span className="font-medium text-[var(--brand-text-primary)]">{mod.label ?? mod.id}</span>
                    {mod.core && <Badge>Core</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--brand-text-secondary)]">
                    {mod.description ?? "Plugin module"}
                  </p>
                </div>
                <label className="onboarding-toggle">
                  <input
                    type="checkbox"
                    checked={mod.enabled}
                    disabled={mod.core}
                    onChange={() => toggleModule(mod.id, mod.core)}
                    aria-label={`Toggle ${mod.label ?? mod.id}`}
                  />
                  <span className="onboarding-toggle__track" />
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onContinue} disabled={saving}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
