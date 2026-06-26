"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ReportDataSource, ReportKpi } from "@fieldforge/sdk";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { useBrand, useConfig } from "@/components/brand-provider";
import { ReportSourceBadge } from "@/components/report-source-badge";
import { Shell, Card, CardContent, CardHeader, CardTitle, NavIcon } from "@fieldforge/ui";
import { useAuth } from "@/lib/auth-context";
import { GuidedTour, type TourStep } from "@/components/guided-tour";
import { SyncBadge } from "@/components/sync-badge";
import { useNavGroupLabel, useShellLabels, useTranslatedNav } from "@/lib/i18n/shell-labels";

const QUICK_LINK_KEYS = [
  { href: "/customers", labelKey: "customers", descKey: "customersDesc", icon: "users" },
  { href: "/estimates", labelKey: "estimates", descKey: "estimatesDesc", icon: "file-text" },
  { href: "/jobs", labelKey: "jobs", descKey: "jobsDesc", icon: "calendar" },
  { href: "/invoices", labelKey: "invoices", descKey: "invoicesDesc", icon: "receipt" },
  { href: "/m/jobs", labelKey: "mobilePwa", descKey: "mobilePwaDesc", icon: "clipboard-list" },
] as const;

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function DashboardPage() {
  const brand = useBrand();
  const { pricing } = useConfig();
  const t = useTranslations("dashboard");
  const { user, token, nav, logout, client } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const shellLabels = useShellLabels();
  const groupLabel = useNavGroupLabel();
  const translatedNav = useTranslatedNav(nav ?? []);
  const [tourActive, setTourActive] = useState(false);
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [kpiSource, setKpiSource] = useState<ReportDataSource>();

  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        target: "[data-tour='stats']",
        title: t("yourModules"),
        body: t("subtitle"),
      },
      {
        target: "[data-tour='modules']",
        title: t("yourModules"),
        body: t("quickLinksSubtitle"),
      },
      {
        target: "[data-tour='quick-links']",
        title: t("customers"),
        body: t("customersDesc"),
      },
    ],
    [t],
  );

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return t("goodMorning");
    if (hour < 17) return t("goodAfternoon");
    return t("goodEvening");
  }

  useEffect(() => {
    if (!token) return;
    client
      .listReportKpis()
      .then((r) => {
        setKpis(r.data ?? []);
        setKpiSource(r.source);
      })
      .catch(console.error);
  }, [token, client]);

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "1") setTourActive(true);
  }, []);

  function finishTour() {
    setTourActive(false);
    router.replace("/dashboard");
  }

  if (!user) return null;

  const displayName = user.email.split("@")[0];
  const liveKpis = kpis.filter((kpi) => ["customers", "active-jobs", "invoices", "revenue-mtd"].includes(kpi.id));

  const safeNav = translatedNav;

  return (
    <Shell
      brand={brand.name}
      wordmarkSrc={brand.logo.wordmark}
      nav={safeNav}
      userEmail={user.email}
      currentPath={pathname}
      onLogout={() => {
        logout();
        router.push("/login");
      }}
      labels={shellLabels}
      groupLabel={groupLabel}
      sidebarFooter={
        <div className="mb-2 px-1">
          <LanguageSwitcher variant="sidebar" />
        </div>
      }
      headerActions={
        <>
          <LanguageSwitcher variant="compact" />
          <SyncBadge surface />
        </>
      }
    >
      <div className="p-6 sm:p-8">
        <header className="dashboard-header page-enter">
          <div className="relative">
            <p className="text-sm font-medium text-[var(--brand-accent)]">{greeting()}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--brand-text-primary)]">
              {t("welcomeBack", { name: displayName })}
            </h1>
            <p className="mt-2 max-w-xl text-[var(--brand-text-secondary)]">{t("subtitle")}</p>
          </div>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-3" data-tour="stats">
          {kpiSource === "live" && liveKpis.length > 0 ? (
            liveKpis.map((kpi, i) => (
              <Card key={kpi.id} className="stat-card stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                <CardContent className="py-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="stat-label">{kpi.label}</p>
                    {i === 0 ? <ReportSourceBadge source={kpiSource} /> : null}
                  </div>
                  <p className="stat-value mt-1">{kpi.value}</p>
                  {kpi.delta && <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{kpi.delta}</p>}
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="stat-card stagger-item" style={{ animationDelay: "0ms" }}>
                <CardContent className="py-5">
                  <p className="stat-label">{t("activeModules")}</p>
                  <p className="stat-value mt-1">{safeNav.length}</p>
                </CardContent>
              </Card>
              <Card className="stat-card stagger-item" style={{ animationDelay: "60ms" }}>
                <CardContent className="py-5">
                  <p className="stat-label">{t("yourRole")}</p>
                  <p className="stat-value mt-1">{formatRole(user.role)}</p>
                </CardContent>
              </Card>
              <Card className="stat-card stagger-item" style={{ animationDelay: "120ms" }}>
                <CardContent className="py-5">
                  <p className="stat-label">{t("freeTrial")}</p>
                  <p className="stat-value mt-1">{t("days", { count: pricing.trial_days })}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/dashboard/owner"
            className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[var(--brand-accent)]"
          >
            {t("ownerView")}
          </a>
          <a
            href="/dashboard/dispatcher"
            className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[var(--brand-accent)]"
          >
            {t("dispatcherView")}
          </a>
          <a
            href="/dashboard/accountant"
            className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[var(--brand-accent)]"
          >
            {t("accountantView")}
          </a>
          <a
            href="/reports"
            className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[var(--brand-accent)]"
          >
            {t("reports")}
          </a>
          <a
            href="/marketplace"
            className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[var(--brand-accent)]"
          >
            {t("marketplace")}
          </a>
          <a
            href="/settings/modules"
            className="rounded-lg border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[var(--brand-accent)]"
          >
            {t("settings")}
          </a>
        </div>

        <div className="mt-8" data-tour="modules">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
            {t("yourModules")}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {safeNav.map((item, i) => (
              <a
                key={item.path}
                href={item.path}
                className="stagger-item"
                style={{ animationDelay: `${(i + 3) * 60}ms` }}
              >
                <Card variant="interactive" className="h-full">
                  <CardContent>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)] text-[var(--brand-accent)]">
                      <NavIcon name={item.icon} size={20} />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--brand-text-primary)]">{item.label}</h3>
                    <p className="mt-1.5 text-sm text-[var(--brand-text-secondary)]">
                      {t("openModule", { module: item.label })}
                    </p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>

        <Card className="mt-8" data-tour="quick-links">
          <CardHeader>
            <CardTitle>{t("quickLinks")}</CardTitle>
            <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("quickLinksSubtitle")}</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_LINK_KEYS.map((link) => (
                <a key={link.href} href={link.href} className="quick-link group">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-surface-elevated)] text-[var(--brand-accent)] transition group-hover:bg-[var(--brand-accent)] group-hover:text-[var(--brand-accent-foreground)]">
                    <NavIcon name={link.icon} size={16} />
                  </span>
                  <span>
                    <span className="block">{t(link.labelKey)}</span>
                    <span className="block text-xs font-normal text-[var(--brand-text-muted)] group-hover:text-[var(--brand-accent)]/70">
                      {t(link.descKey)}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <GuidedTour steps={tourSteps} active={tourActive} onFinish={finishTour} />
    </Shell>
  );
}
