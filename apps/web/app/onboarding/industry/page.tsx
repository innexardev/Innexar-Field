"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import {
  IconBuilding,
  IconSparkles,
  IconTruck,
  IconWrench,
  Button,
  Card,
  CardContent,
  Badge,
} from "@fieldforge/ui";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ErrorBanner } from "@/components/error-banner";
import { useOnboarding } from "@/lib/onboarding/use-onboarding";
import { nextStep, stepPath } from "@/lib/onboarding/steps";

const PACK_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  cleaning: IconSparkles,
  construction: IconBuilding,
  "field-services": IconWrench,
  "property-maintenance": IconTruck,
  "multi-service": IconBuilding,
};

function PackIcon({ packId }: { packId: string }) {
  const Icon = PACK_ICONS[packId] ?? IconWrench;
  return <Icon size={28} />;
}

export default function OnboardingIndustryPage() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const { state, packs, ready, saveIndustry, goToStep, saving, error } = useOnboarding();
  const [selected, setSelected] = useState<string[]>([]);

  const allPacks = packs;

  useEffect(() => {
    if (state) setSelected(state.industryPacks ?? []);
  }, [state]);

  useEffect(() => {
    if (ready && state && state.currentStep !== "industry") goToStep("industry");
  }, [ready, state, goToStep]);

  function togglePack(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onContinue() {
    if (selected.length === 0 || saving) return;
    try {
      await saveIndustry(selected);
      const nxt = nextStep("industry");
      if (nxt) {
        goToStep(nxt);
        router.push(stepPath(nxt));
      }
    } catch {
      /* error surfaced via hook */
    }
  }

  const previewCount = selected.reduce((sum, id) => {
    const pack = allPacks.find((p) => p.id === id);
    return sum + (pack?.modules?.length ?? 0);
  }, 0);

  return (
    <OnboardingShell step="industry">
      <div className="onboarding-content">
        <header className="onboarding-page-header">
          <h1 className="onboarding-title">{t("industryTitle")}</h1>
          <p className="onboarding-subtitle">{t("industrySubtitle")}</p>
        </header>

        <ErrorBanner message={error} className="mb-4" />

        <div className="onboarding-card-grid">
          {allPacks.map((pack, i) => {
            const active = selected.includes(pack.id);
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => togglePack(pack.id)}
                className={`onboarding-select-card stagger-item${active ? " onboarding-select-card--active" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
                aria-pressed={active}
              >
                <div className="onboarding-select-card__icon">
                  <PackIcon packId={pack.id} />
                </div>
                <div className="onboarding-select-card__body">
                  <div className="flex items-center gap-2">
                    <h3 className="onboarding-select-card__title">{pack.name}</h3>
                    {active && <Badge tone="success">Selected</Badge>}
                  </div>
                  <p className="onboarding-select-card__desc">{pack.description}</p>
                  <p className="onboarding-select-card__meta">{(pack.modules ?? []).length} modules included</p>
                </div>
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <Card className="onboarding-preview-banner">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--brand-text-secondary)]">
                You&apos;ll get access to <strong className="text-[var(--brand-text-primary)]">{previewCount}</strong>{" "}
                pre-configured capabilities across {selected.length} pack
                {selected.length > 1 ? "s" : ""}.
              </p>
              <Button onClick={onContinue} disabled={saving} className="shrink-0 sm:min-w-[140px]">
                {saving ? tc("loading") : t("continue")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </OnboardingShell>
  );
}
