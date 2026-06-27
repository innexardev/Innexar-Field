"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@fieldforge/ui";

export function ModuleDisabledState({
  moduleName,
  icon,
}: {
  moduleName: string;
  icon?: ReactNode;
}) {
  const tc = useTranslations("modules.common");

  return (
    <div className="empty-state">
      {icon ? <div className="empty-state-icon">{icon}</div> : null}
      <h3 className="text-lg font-semibold">{tc("moduleDisabledTitle", { module: moduleName })}</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--brand-text-secondary)]">
        {tc("moduleDisabledDescription")}
      </p>
      <Link href="/settings/modules" className="mt-6 inline-block">
        <Button>{tc("enableModule")}</Button>
      </Link>
    </div>
  );
}
