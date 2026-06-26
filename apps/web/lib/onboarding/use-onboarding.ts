"use client";

import { useCallback, useEffect, useState } from "react";
import type { IndustryPack, NavItem, OnboardingModulePreview } from "@fieldforge/sdk";
import { formatErrorForUser } from "@fieldforge/sdk";
import { mergeIndustryPacks } from "./industry-packs";
import { useAuth } from "@/lib/auth-context";
import {
  fetchModulesPreviewFromApi,
  fetchOnboardingFromApi,
  loadOnboardingState,
  mergeModulesFromPacks,
  mergeOnboardingState,
  modulesPreviewToRecord,
  patchOnboardingState,
  persistCompleteToApi,
  persistIndustryToApi,
  persistModulesToApi,
  persistProfileToApi,
  persistSkipSetupToApi,
  saveOnboardingState,
  setOnboardingStep,
} from "./storage";
import type { OnboardingProfile, OnboardingSetup, OnboardingState } from "./types";
import type { OnboardingStepId } from "./steps";

const FALLBACK_PACKS: IndustryPack[] = [
  {
    id: "cleaning",
    name: "House Cleaning",
    description: "Recurring cleans, crews, and client portal",
    modules: ["crm", "estimating", "scheduling", "invoicing", "cleaning"],
  },
  {
    id: "construction",
    name: "Construction",
    description: "Estimates, job costing, change orders",
    modules: ["crm", "estimating", "scheduling", "invoicing", "construction", "job-costing"],
  },
  {
    id: "field-services",
    name: "Field Services",
    description: "Dispatch, work orders, and mobile PWA",
    modules: ["crm", "estimating", "scheduling", "invoicing", "dispatch", "accounting"],
  },
];

export function useOnboarding() {
  const { client, token, applyNav, refreshNav } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [packs, setPacks] = useState<IndustryPack[]>([]);
  const [modulePreview, setModulePreview] = useState<OnboardingModulePreview[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    let cancelled = false;
    const local = loadOnboardingState();
    setState(local);

    const load = async () => {
      try {
        const packsRes = await client.getIndustryPacks();
        if (!cancelled) setPacks(mergeIndustryPacks(packsRes.data));
      } catch {
        if (!cancelled) setPacks(mergeIndustryPacks(FALLBACK_PACKS));
      }

      if (token) {
        const apiState = await fetchOnboardingFromApi(client);
        if (!cancelled && apiState) {
          saveOnboardingState(apiState);
          setState(apiState);
        }

        const preview = await fetchModulesPreviewFromApi(client);
        if (!cancelled && preview.length) {
          setModulePreview(preview);
          setState((prev) => {
            if (!prev) return prev;
            const next = { ...prev, modules: modulesPreviewToRecord(preview) };
            saveOnboardingState(next);
            return next;
          });
        }
      }

      if (!cancelled) setReady(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [client, token]);

  const persist = useCallback((next: OnboardingState) => {
    saveOnboardingState(next);
    setState(next);
  }, []);

  const goToStep = useCallback(
    (step: OnboardingStepId) => {
      persist(setOnboardingStep(step));
    },
    [persist],
  );

  const update = useCallback(
    (patch: Partial<OnboardingState>) => {
      persist(patchOnboardingState(patch));
    },
    [persist],
  );

  const saveIndustry = useCallback(
    async (ids: string[]) => {
      setSaving(true);
      clearError();
      try {
        const current = state ?? loadOnboardingState();
        const pending = mergeModulesFromPacks(current, packs, ids);
        const next = token
          ? await persistIndustryToApi(client, ids, pending)
          : (saveOnboardingState(pending), pending);
        setState(next);
      } catch (err) {
        setError(formatErrorForUser(err));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [client, packs, state, token, clearError],
  );

  const saveProfile = useCallback(
    async (profile: OnboardingProfile) => {
      setSaving(true);
      clearError();
      try {
        const current = state ?? loadOnboardingState();
        const pending = mergeOnboardingState(current, { profile });
        const next = token
          ? await persistProfileToApi(client, profile, pending)
          : (saveOnboardingState(pending), pending);
        setState(next);
      } catch (err) {
        setError(formatErrorForUser(err));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [client, state, token, clearError],
  );

  const saveModules = useCallback(
    async (modules: Record<string, boolean>) => {
      setSaving(true);
      clearError();
      try {
        const current = state ?? loadOnboardingState();
        const pending = mergeOnboardingState(current, { modules });
        const next = token
          ? await persistModulesToApi(client, modules, pending)
          : (saveOnboardingState(pending), pending);
        setState(next);
      } catch (err) {
        setError(formatErrorForUser(err));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [client, state, token, clearError],
  );

  const skipSetup = useCallback(
    async (setup: OnboardingSetup) => {
      setSaving(true);
      clearError();
      try {
        const current = state ?? loadOnboardingState();
        const pending = mergeOnboardingState(current, {
          setup: { ...setup, stripeSkipped: true, csvSkipped: true },
          currentStep: "complete",
        });
        const next = token
          ? await persistSkipSetupToApi(client, pending)
          : (saveOnboardingState(pending), pending);
        setState(next);
      } catch (err) {
        setError(formatErrorForUser(err));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [client, state, token, clearError],
  );

  const saveSetup = useCallback(
    async (setup: OnboardingSetup) => {
      setSaving(true);
      clearError();
      try {
        const current = state ?? loadOnboardingState();
        const pending = mergeOnboardingState(current, { setup, currentStep: "complete" });
        saveOnboardingState(pending);
        setState(pending);
      } finally {
        setSaving(false);
      }
    },
    [state],
  );

  const finish = useCallback(async (): Promise<NavItem[]> => {
    setSaving(true);
    clearError();
    try {
      const current = state ?? loadOnboardingState();
      const pending = mergeOnboardingState(current, { completed: true, currentStep: "complete" });
      if (token) {
        const { state: next, nav } = await persistCompleteToApi(client, pending);
        setState(next);
        applyNav(nav);
        return nav;
      }
      saveOnboardingState(pending);
      setState(pending);
      await refreshNav().catch(() => {});
      return [];
    } catch (err) {
      setError(formatErrorForUser(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [applyNav, client, refreshNav, state, token, clearError]);

  const selectIndustryPacks = useCallback(
    (ids: string[]) => {
      setState((prev) => {
        const current = prev ?? loadOnboardingState();
        return mergeModulesFromPacks(current, packs, ids);
      });
    },
    [packs],
  );

  const loadModulePreview = useCallback(async () => {
    if (!token) return;
    const preview = await fetchModulesPreviewFromApi(client);
    if (!preview.length) return;
    setModulePreview(preview);
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, modules: modulesPreviewToRecord(preview) };
      saveOnboardingState(next);
      return next;
    });
  }, [client, token]);

  return {
    state,
    packs,
    modulePreview,
    ready,
    saving,
    error,
    clearError,
    goToStep,
    update,
    saveIndustry,
    saveProfile,
    saveModules,
    skipSetup,
    saveSetup,
    finish,
    selectIndustryPacks,
    loadModulePreview,
  };
}
