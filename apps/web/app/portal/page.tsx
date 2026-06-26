"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconFileText,
  IconReceipt,
  IconUsers,
} from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { PORTAL_CUSTOMER_ROUTES, portalHref } from "@/lib/portal-routes";
import { useAppPage } from "@/lib/use-app-page";

const PORTAL_SECTIONS = [
  {
    title: "Quotes & approvals",
    description: "Share branded estimate links so customers can review and accept quotes online.",
    href: "/estimates",
    icon: IconFileText,
  },
  {
    title: "Invoices & payments",
    description: "Let clients view outstanding invoices and pay through Stripe Connect.",
    href: "/invoices",
    icon: IconReceipt,
  },
  {
    title: "Customer accounts",
    description: "CRM profiles, properties, and contact history for portal users.",
    href: "/customers",
    icon: IconUsers,
  },
];

export default function PortalPage() {
  const { brand } = useAppPage();
  const t = useTranslations("modules.portal");
  const tc = useTranslations("modules.common");

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle", { brand: brand.name })}
    >
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Portal hub</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
            Send public links from estimates and invoices. Preview customer-facing portal screens below.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {PORTAL_SECTIONS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="block">
                <Card
                  className="h-full transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))] stagger-item"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-info-subtle)]">
                      <Icon size={20} className="text-[var(--brand-accent)]" />
                    </div>
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{item.description}</p>
                    <span className="mt-3 inline-block text-sm text-[var(--brand-accent)]">Open →</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
          Customer experience
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTAL_CUSTOMER_ROUTES.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link key={item.slug} href={portalHref(item.slug)} className="block">
                <Card
                  className="h-full transition hover:border-[color-mix(in_srgb,var(--brand-accent)_30%,var(--brand-border))] stagger-item"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-info-subtle)]">
                      <Icon size={20} className="text-[var(--brand-accent)]" />
                    </div>
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{item.description}</p>
                    <span className="mt-3 inline-block text-sm text-[var(--brand-accent)]">Preview →</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </ModulePage>
  );
}
