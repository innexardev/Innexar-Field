"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconChart,
  IconCreditCard,
  IconFileText,
  IconReceipt,
  IconUsers,
  IconWrench,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const SETTINGS_SECTIONS = [
  {
    title: "Workspace",
    links: [
      {
        href: "/settings/modules",
        title: "Modules",
        description: "Enable or disable plugins after onboarding.",
        icon: IconWrench,
      },
      {
        href: "/settings/integrations",
        title: "Integrations",
        description: "QuickBooks, Avalara, and Stripe Connect.",
        icon: IconFileText,
      },
      {
        href: "/settings/users",
        title: "Users",
        description: "Workspace members and roles.",
        icon: IconUsers,
      },
      {
        href: "/settings/templates",
        title: "Email templates",
        description: "Transactional email templates with merge variables.",
        icon: IconFileText,
      },
      {
        href: "/settings/billing",
        title: "Plan configuration",
        description: "Stripe price IDs and SaaS plan mapping.",
        icon: IconCreditCard,
      },
      {
        href: "/billing",
        title: "Billing",
        description: "Subscription plan, payment method, and SaaS checkout.",
        icon: IconCreditCard,
      },
    ],
  },
  {
    title: "Accounting",
    links: [
      {
        href: "/accounting/chart",
        title: "Chart of accounts",
        description: "General ledger accounts and balances.",
        icon: IconChart,
      },
      {
        href: "/accounting/ap",
        title: "Accounts payable",
        description: "Vendor bills and payment obligations.",
        icon: IconReceipt,
      },
      {
        href: "/accounting/ar",
        title: "Accounts receivable",
        description: "Outstanding invoices and AR aging.",
        icon: IconCreditCard,
      },
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAppPage();
  const t = useTranslations("modules.settings");
  const tc = useTranslations("modules.common");

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle", { email: user?.email ?? "" })}>
      <div className="space-y-10">
        {SETTINGS_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-4 text-lg font-semibold text-[var(--brand-text-primary)]">{section.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.links.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <Card
                      className="h-full transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))] stagger-item"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-info-subtle)]">
                            <Icon size={18} className="text-[var(--brand-accent)]" />
                          </div>
                          <CardTitle className="text-base">{item.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-[var(--brand-text-secondary)]">{item.description}</p>
                        <span className="mt-3 inline-block text-sm text-[var(--brand-accent)]">Open →</span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </ModulePage>
  );
}
