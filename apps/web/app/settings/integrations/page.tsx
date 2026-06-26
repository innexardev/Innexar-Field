"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconCreditCard,
  IconFileText,
  IconReceipt,
} from "@fieldforge/ui";
import { formatErrorForUser, type IntegrationCatalogItem, type IntegrationStatus } from "@fieldforge/sdk";
import { ErrorBanner } from "@/components/error-banner";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

const CATEGORY_ICONS: Record<string, typeof IconCreditCard> = {
  accounting: IconFileText,
  tax: IconReceipt,
  payments: IconCreditCard,
};

function statusTone(status: string): "success" | "warning" | "default" {
  if (status === "connected") return "success";
  if (status === "pending") return "warning";
  return "default";
}

function isMockConnection(status?: IntegrationStatus): boolean {
  return status?.metadata?.mock === true;
}

function formatExternalId(status?: IntegrationStatus): string | null {
  if (!status?.external_id) return null;
  if (status.integration_id === "quickbooks") return `Realm ${status.external_id}`;
  if (status.integration_id === "stripe_connect") return `Account ${status.external_id}`;
  return status.external_id;
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
  const [taxPreview, setTaxPreview] = useState<string>("");
  const [notice, setNotice] = useState("");

  const statusById = useMemo(() => {
    const map = new Map<string, IntegrationStatus>();
    for (const st of statuses) map.set(st.integration_id, st);
    return map;
  }, [statuses]);

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
        setNotice("Completing Stripe Connect stub onboarding…");
        try {
          await client.completeStripeConnect(accountId);
          setNotice("Stripe Connect connected (dev stub).");
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
        setNotice("Completing QuickBooks OAuth stub…");
        try {
          await client.completeQuickBooksOAuth(params.get("code") ?? "", params.get("state") ?? undefined);
          setNotice("QuickBooks connected (dev stub).");
          await refresh();
        } catch (e) {
          setError(formatErrorForUser(e));
        } finally {
          setBusyId(null);
          cleanupUrl();
        }
      })();
    }
  }, [client, refresh]);

  async function connectQuickBooks() {
    setBusyId("quickbooks");
    setError("");
    try {
      const redirectUri = `${window.location.origin}/settings/integrations?quickbooks=mock`;
      const start = await client.startQuickBooksOAuth(redirectUri);
      if (start.mock) {
        window.location.href = start.authorize_url;
        return;
      }
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
      setTaxPreview(
        `$100.00 + $${(result.tax_cents / 100).toFixed(2)} tax (${result.rate_percent}%) = $${(result.total_cents / 100).toFixed(2)}`,
      );
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setBusyId(null);
    }
  }

  function actionFor(integration: IntegrationCatalogItem) {
    const status = statusById.get(integration.id)?.status ?? "disconnected";
    if (integration.id === "quickbooks") {
      if (status === "connected") {
        return (
          <Button variant="secondary" onClick={() => void disconnectQuickBooks()} disabled={busyId === integration.id}>
            Disconnect
          </Button>
        );
      }
      return (
        <Button onClick={() => void connectQuickBooks()} disabled={busyId === integration.id}>
          {busyId === integration.id ? "Connecting…" : "Connect QuickBooks"}
        </Button>
      );
    }
    if (integration.id === "stripe_connect") {
      if (status === "connected") {
        return (
          <Link href="/billing" className="text-sm text-[var(--brand-accent)]">
            Manage in Billing →
          </Link>
        );
      }
      return (
        <Button onClick={() => void connectStripe()} disabled={busyId === integration.id}>
          {busyId === integration.id ? "Starting…" : "Connect Stripe"}
        </Button>
      );
    }
    if (integration.id === "avalara") {
      return (
        <Button variant="secondary" onClick={() => void previewAvalaraTax()} disabled={busyId === integration.id}>
          Preview tax calc
        </Button>
      );
    }
    return null;
  }

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <div className="mb-4">
        <Link href="/settings" className="text-sm text-[var(--brand-accent)]">
          {tc("backToSettings")}
        </Link>
      </div>

      <ErrorBanner message={error} className="mb-4" />
      {notice && (
        <p className="mb-4 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-success-subtle)] px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {taxPreview && (
        <p className="mb-4 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-info-subtle)] px-4 py-3 text-sm">
          Avalara preview: {taxPreview}
          {taxPreview.includes("8.25") && (
            <span className="ml-2 rounded bg-[var(--brand-warning-subtle)] px-2 py-0.5 text-xs text-[var(--brand-text-secondary)]">
              mock rate
            </span>
          )}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">Loading integrations…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {catalog.map((integration) => {
            const Icon = CATEGORY_ICONS[integration.category] ?? IconFileText;
            const connection = statusById.get(integration.id);
            const status = connection?.status ?? "disconnected";
            const externalLabel = formatExternalId(connection);
            const mock = isMockConnection(connection);
            return (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-info-subtle)] text-[var(--brand-accent)]">
                      <Icon size={22} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={statusTone(status)}>{status}</Badge>
                      {mock && <Badge tone="warning">dev stub</Badge>}
                    </div>
                  </div>
                  <CardTitle className="mt-3">{integration.name}</CardTitle>
                  <p className="text-sm text-[var(--brand-text-secondary)]">{integration.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--brand-text-muted)]">{integration.category}</p>
                  {externalLabel && (
                    <p className="text-xs text-[var(--brand-text-secondary)]">{externalLabel}</p>
                  )}
                  {actionFor(integration)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ModulePage>
  );
}
