"use client";

import { LanguageSwitcher } from "@fieldforge/i18n";
import { HelpSidebarLink } from "@/components/help/help-sidebar-link";

/** Help + language controls shared across dashboard and module shell footers. */
export function AppSidebarFooter() {
  return (
    <div className="mb-2 space-y-1 px-1">
      <HelpSidebarLink />
      <LanguageSwitcher variant="sidebar" />
    </div>
  );
}
