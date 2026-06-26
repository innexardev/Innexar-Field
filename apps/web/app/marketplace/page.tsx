"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { MarketplacePlugin } from "@fieldforge/sdk";
import { Badge, Card, CardContent, FeatureCard, IconSparkles, NavIcon } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { CORE_MODULES, MODULE_META } from "@/lib/onboarding/modules";
import { useAppPage } from "@/lib/use-app-page";

export default function MarketplacePage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.marketplace");
  const tc = useTranslations("modules.common");
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    client
      .listMarketplacePlugins()
      .then((r) => setPlugins(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, client]);

  const cards = useMemo(() => {
    return plugins.map((p) => {
      const meta = MODULE_META[p.id];
      const isCore = (CORE_MODULES as readonly string[]).includes(p.id);
      return {
        ...p,
        description: meta?.description ?? `Extend your workspace with ${p.name}.`,
        premium: !isCore,
      };
    });
  }, [plugins]);

  const enabledCount = cards.filter((c) => c.enabled).length;

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--brand-text-secondary)]">
            {enabledCount} of {cards.length} plugins active in your tenant
          </p>
        </div>
        <a
          href="/settings/modules"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-sm font-medium text-[var(--brand-text-primary)] transition hover:border-[color-mix(in_srgb,var(--brand-accent)_35%,var(--brand-border))]"
        >
          Manage modules
        </a>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--brand-text-muted)]">Loading marketplace…</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((plugin, i) => (
            <Card
              key={plugin.id}
              className={`stagger-item overflow-hidden${plugin.premium ? " border-[color-mix(in_srgb,var(--brand-accent)_25%,var(--brand-border))]" : ""}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="p-0">
                <div className="border-b border-[var(--brand-border)] bg-[color-mix(in_srgb,var(--brand-accent)_6%,var(--brand-surface))] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] text-[var(--brand-accent)]">
                      {plugin.premium ? <IconSparkles size={22} /> : <NavIcon name="puzzle" size={22} />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plugin.enabled ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge>Available</Badge>
                      )}
                      {plugin.premium && <Badge tone="default">Premium</Badge>}
                    </div>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--brand-text-primary)]">{plugin.name}</h3>
                  <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{plugin.description}</p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <p className="text-xs text-[var(--brand-text-muted)]">
                    v{plugin.version}
                    {plugin.industry_packs.length > 0 &&
                      ` · ${plugin.industry_packs.slice(0, 2).join(", ")}`}
                  </p>
                  {!plugin.enabled && (
                    <a
                      href="/settings/modules"
                      className="block w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-2 text-center text-sm font-medium transition hover:border-[var(--brand-accent)]"
                    >
                      Enable in settings
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
          Coming soon
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<IconSparkles size={20} />}
            title="Price book"
            description="Regional labor and material rates synced to estimates."
          />
          <FeatureCard
            icon={<IconSparkles size={20} />}
            title="Client portal"
            description="Let customers approve quotes and pay invoices online."
          />
          <FeatureCard
            icon={<IconSparkles size={20} />}
            title="Accounting sync"
            description="QuickBooks and Xero integrations for GL and AP/AR."
          />
        </div>
      </div>
    </ModulePage>
  );
}
