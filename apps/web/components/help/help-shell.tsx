"use client";

import type { ReactNode } from "react";
import { ModulePage } from "@/components/module-page";
import { HelpNav } from "@/components/help/help-nav";

export function HelpShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <ModulePage title={title} subtitle={subtitle}>
      <HelpNav />
      {children}
    </ModulePage>
  );
}
