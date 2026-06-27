"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { translateNavGroupLabel, translateNavItems } from "@fieldforge/i18n";
import type { NavItem } from "@fieldforge/sdk";
import type { ShellLabels } from "@fieldforge/ui";

export function useShellLabels(): ShellLabels {
  const t = useTranslations("shell");
  return {
    workspace: t("workspace"),
    core: t("core"),
    dashboard: t("dashboard"),
    profile: t("profile"),
    settings: t("settings"),
    signOut: t("signOut"),
    openNavigation: t("openNavigation"),
    closeNavigation: t("closeNavigation"),
    closeMenu: t("closeMenu"),
  };
}

export function useNavGroupLabel() {
  const t = useTranslations("nav");
  return (englishLabel: string) => translateNavGroupLabel(englishLabel, (key) => t(key));
}

export function useTranslatedNav(nav: NavItem[]) {
  const t = useTranslations("navItems");
  return useMemo(
    () => translateNavItems(nav, (key) => t(key)),
    [nav, t],
  );
}
