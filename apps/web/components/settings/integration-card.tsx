"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconChevronDown,
  IconCreditCard,
  IconFileText,
  IconReceipt,
} from "@fieldforge/ui";

const CATEGORY_ICONS: Record<string, typeof IconCreditCard> = {
  accounting: IconFileText,
  tax: IconReceipt,
  payments: IconCreditCard,
  email: IconFileText,
};

function IconMail({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export type IntegrationDisplayStatus = "connected" | "notConnected" | "mock";

type IntegrationCardProps = {
  integrationId: string;
  name: string;
  description: string;
  category: string;
  displayStatus: IntegrationDisplayStatus;
  externalLabel?: string | null;
  stepKeys: string[];
  actions?: ReactNode;
  footer?: ReactNode;
};

function statusTone(status: IntegrationDisplayStatus): "success" | "warning" | "default" {
  if (status === "connected") return "success";
  if (status === "mock") return "warning";
  return "default";
}

export function IntegrationCard({
  integrationId,
  name,
  description,
  category,
  displayStatus,
  externalLabel,
  stepKeys,
  actions,
  footer,
}: IntegrationCardProps) {
  const t = useTranslations("modules.settingsIntegrations");
  const Icon = integrationId === "smtp" ? IconMail : (CATEGORY_ICONS[category] ?? IconFileText);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-info-subtle)] text-[var(--brand-accent)]">
            <Icon size={22} />
          </div>
          <Badge tone={statusTone(displayStatus)}>{t(`status.${displayStatus}`)}</Badge>
        </div>
        <CardTitle className="mt-4 text-lg">{name}</CardTitle>
        <p className="text-sm leading-relaxed text-[var(--brand-text-secondary)]">{description}</p>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]">
          {t(`categories.${category}` as "categories.accounting")}
        </p>
        {externalLabel && (
          <p className="rounded-lg bg-[var(--brand-surface-elevated)] px-3 py-2 text-xs text-[var(--brand-text-secondary)]">
            {externalLabel}
          </p>
        )}

        <details className="group rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-[var(--brand-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
            <span>{t("howToConnect")}</span>
            <IconChevronDown
              size={16}
              className="shrink-0 text-[var(--brand-text-muted)] transition group-open:rotate-180"
            />
          </summary>
          <ol className="space-y-2 border-t border-[var(--brand-border)] px-4 py-3 text-sm text-[var(--brand-text-secondary)]">
            {stepKeys.map((key, index) => (
              <li key={key} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-xs font-semibold text-[var(--brand-accent)]">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{t(`cards.${integrationId}.steps.${key}`)}</span>
              </li>
            ))}
          </ol>
        </details>

        {actions}
        {footer}
        <Link
          href="/help/manual/integrations"
          className="inline-block text-xs text-[var(--brand-accent)] hover:underline"
        >
          {t("manualLink")} →
        </Link>
      </CardContent>
    </Card>
  );
}
