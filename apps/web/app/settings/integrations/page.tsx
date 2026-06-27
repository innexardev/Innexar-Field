"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@fieldforge/ui";
import {
  formatErrorForUser,
  type IntegrationCatalogItem,
  type IntegrationStatus,
} from "@fieldforge/sdk";
import { ErrorBanner } from "@/components/error-banner";
import { ModulePage } from "@/components/module-page";
import {
  IntegrationCard,
  type IntegrationDisplayStatus,
} from "@/components/settings/integration-card";
import { useAppPage } from "@/lib/use-app-page";

const STEP_KEYS: Record<string, string[]> = {
  stripe_connect: ["step1", "step2", "step3", "step4"],
  quickbooks: ["step1", "step2", "step3", "step4", "step5"],
  avalara: ["step1", "step2", "step3"],
  smtp: ["step1", "step2", "step3"],
};

const CARD_ORDER = ["stripe_connect", "quickbooks", "avalara", "smtp"] as const;

function isMockConnection(status?: IntegrationStatus): boolean {
  return status?.metadata?.mock === true;
}

function formatExternalId(status?: IntegrationStatus): string | null {
  if (!status?.external_id) return null;
  if (status.integration_id === "quickbooks") return `Realm ${status.external_id}`;
  if (status.integration_id === "stripe_connect") return `Account ${status.external_id}`;
  return status.external_id;
}

function resolveDisplayStatus(
  integrationId: string,
  connection?: IntegrationStatus,
  avalaraMock?: boolean,
): IntegrationDisplayStatus {
  if (integrationId === "avalara" && avalaraMock) return "mock";
  if (integrationId === "smtp") return "notConnected";

  const mock = isMockConnection(connection);
  const status = connection?.status ?? "disconnected";

  if (mock && status !== "connected") return "mock";
  if (status === "connected") return mock ? "mock" : "connected";
  if (mock) return "mock";
  return "notConnected";
}

export default function IntegrationsSettingsPage() {
  const { client } = useAppPage();
  const t = useTranslations("modules.settingsIntegrations");
  const tc = useTranslations("modules.common");
  const [catalog, setCatalog] = useState<IntegrationCatalogItem[]>([]);
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [taxPreview, setTaxPreview] = useState("");
  const [avalaraMock, setAvalaraMock] = useState(false);
  const [notice, setNotice] = useState("");

  const statusById = useMemo(() => {
    const map = new Map<string, IntegrationStatus>();
    for (const st of statuses) map.set(st.integration_id, st);
    return map;
  }, [statuses]);

  const catalogById = useMemo(() => {
    const map = new Map<string, IntegrationCatalogItem>();
    for (const item of catalog) map.set(item.id, item);
    return map;
  }, [catalog]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cat, st] = await Promise.all([client.listIntegrations(), client.listIntegrationStatus()]);
      setCatalog(cat.data);
      setStatuses(st.data);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accountId = params.get("account_id");
    const cleanupUrl = () => {
      window.history.replaceState({}, "", "/settings/integrations");
    };

    if (params.get("stripe_connect") === "mock" && accountId) {
      void (async () => {
        setBusyId("stripe_connect");
        setNotice(t("notices.stripeMockComplete"));
        try {
          await client.completeStripeConnect(accountId);
          setNotice(t("notices.stripeConnectedMock"));
          await refresh();
        } catch (e) {
          setError(formatErrorForUser(e));
        } finally {
          setBusyId(null);
          cleanupUrl();
        }
      })();
    }
    if (params.get("quickbooks") === "mock" && params.get("code")) {
      void (async () => {
        setBusyId("quickbooks");
        setNotice(t("notices.quickbooksMockComplete"));
        try {
          await client.completeQuickBooksOAuth(
            params.get("code") ?? "",
            params.get("state") ?? undefined,
            params.get("realmId") ?? undefined,
          );
          setNotice(t("notices.quickbooksConnectedMock"));
          await refresh();
        } catch (e) {
          setError(formatErrorForUser(e));
        } finally {
          setBusyId(null);
          cleanupUrl();
        }
      })();
    }
    if (params.get("quickbooks") === "callback" && params.get("code")) {
      void (async () => {
        setBusyId("quickbooks");
        setNotice(t("notices.quickbooksComplete"));
        try {
          await client.completeQuickBooksOAuth(
            params.get("code") ?? "",
            params.get("state") ?? undefined,
            params.get("realmId") ?? undefined,
          );
          setNotice(t("notices.quickbooksConnected"));
          await refresh();
        } catch (e) {
          setError(formatErrorForUser(e));
        } finally {
          setBusyId(null);
          cleanupUrl();
        }
      })();
    }
  }, [client, refresh, t]);

  async function connectQuickBooks() {
    setBusyId("quickbooks");
    setError("");
    try {
      const returnPath = `${window.location.origin}/settings/integrations?quickbooks=callback`;
      const start = await client.connectQuickBooks(returnPath);
      window.location.href = start.authorize_url;
    } catch (e) {
      setError(formatErrorForUser(e));
      setBusyId(null);
    }
  }

  async function disconnectQuickBooks() {
    setBusyId("quickbooks");
    setError("");
    try {
      await client.disconnectQuickBooks();
      await refresh();
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setBusyId(null);
    }
  }

  async function connectStripe() {
    setBusyId("stripe_connect");
    setError("");
    try {
      const result = await client.startStripeConnectOnboarding("/settings/integrations");
      window.location.href = result.onboarding_url;
    } catch (e) {
      setError(formatErrorForUser(e));
      setBusyId(null);
    }
  }

  async function previewAvalaraTax() {
    setBusyId("avalara");
    setError("");
    try {
      const result = await client.calculateAvalaraTax({ amount_cents: 10000, ship_to_state: "TX", ship_to_zip: "78701" });
      setAvalaraMock(result.mock === true);
      setTaxPreview(
        t("avalaraPreviewResult", {
          amount: "$100.00",
          tax: `$${(result.tax_cents / 100).toFixed(2)}`,
          rate: result.rate_percent,
          total: `$${(result.total_cents / 100).toFixed(2)}`,
        }),
      );
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setBusyId(null);
    }
  }

  function cardMeta(integrationId: string): { name: string; description: string; category: string } {
    const fromCatalog = catalogById.get(integrationId);
    if (fromCatalog) {
      return {
        name: fromCatalog.name,
        description: fromCatalog.description,
        category: fromCatalog.category,
      };
    }
    return {
      name: t(`cards.${integrationId}.name`),
      description: t(`cards.${integrationId}.description`),
      category: integrationId === "smtp" ? "email" : "accounting",
    };
  }

  function actionsFor(integrationId: string) {
    const status = statusById.get(integrationId)?.status ?? "disconnected";

    if (integrationId === "quickbooks") {
      if (status === "connected") {
        return (
          <Button variant="secondary" onClick={() => void disconnectQuickBooks()} disabled={busyId === integrationId}>
            {t("actions.disconnect")}
          </Button>
        );
      }
      return (
        <Button onClick={() => void connectQuickBooks()} disabled={busyId === integrationId}>
          {busyId === integrationId
            ? t("actions.connecting")
            : status === "pending"
              ? t("actions.continueSetup")
              : t("actions.connectQuickBooks")}
        </Button>
      );
    }

    if (integrationId === "stripe_connect") {
      if (status === "connected") {
        return (
          <Link href="/billing" className="text-sm font-medium text-[var(--brand-accent)] hover:underline">
            {t("actions.manageInBilling")} →
          </Link>
        );
      }
      return (
        <Button onClick={() => void connectStripe()} disabled={busyId === integrationId}>
          {busyId === integrationId ? t("actions.starting") : t("actions.connectStripe")}
        </Button>
      );
    }

    if (integrationId === "avalara") {
      return (
        <Button variant="secondary" onClick={() => void previewAvalaraTax()} disabled={busyId === integrationId}>
          {t("actions.previewTax")}
        </Button>
      );
    }

    if (integrationId === "smtp") {
      return (
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("cards.smtp.platformManaged")}</p>
      );
    }

    return null;
  }

  const visibleCards = CARD_ORDER.filter(
    (id) => id === "smtp" || catalogById.has(id),
  );

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/settings" className="text-sm text-[var(--brand-accent)] hover:underline">
          {tc("backToSettings")}
        </Link>
        <Link
          href="/help/manual/integrations"
          className="text-sm text-[var(--brand-text-secondary)] hover:text-[var(--brand-accent)]"
        >
          {t("manualLink")} →
        </Link>
      </div>

      <ErrorBanner message={error} className="mb-4" />
      {notice && (
        <p className="mb-4 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-success-subtle)] px-4 py-3 text-sm">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("loading")}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visibleCards.map((integrationId, index) => {
            const connection = statusById.get(integrationId);
            const meta = cardMeta(integrationId);
            const displayStatus = resolveDisplayStatus(integrationId, connection, avalaraMock);
            const externalLabel = formatExternalId(connection);

            return (
              <div key={integrationId} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                <IntegrationCard
                  integrationId={integrationId}
                  name={meta.name}
                  description={meta.description}
                  category={meta.category}
                  displayStatus={displayStatus}
                  externalLabel={externalLabel}
                  stepKeys={STEP_KEYS[integrationId] ?? []}
                  actions={actionsFor(integrationId)}
                  footer={
                    integrationId === "avalara" && taxPreview ? (
                      <p className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-info-subtle)] px-3 py-2 text-sm">
                        {taxPreview}
                        {avalaraMock && (
                          <BadgeInline label={t("status.mock")} />
                        )}
                      </p>
                    ) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </ModulePage>
  );
}

function BadgeInline({ label }: { label: string }) {
  return (
    <span className="ml-2 rounded bg-[var(--brand-warning-subtle)] px-2 py-0.5 text-xs text-[var(--brand-text-secondary)]">
      {label}
    </span>
  );
}
