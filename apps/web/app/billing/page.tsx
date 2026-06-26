"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

export default function BillingPage() {
  const { client } = useAppPage();
  const t = useTranslations("modules.billing");
  const tc = useTranslations("modules.common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectStatus, setConnectStatus] = useState<string>("disconnected");

  useEffect(() => {
    void client.getStripeConnectStatus().then((st) => setConnectStatus(st.status)).catch(() => undefined);
  }, [client]);

  async function startCheckout() {
    setLoading(true);
    setError("");
    try {
      const session = await client.createCheckout();
      if (session.checkout_url) {
        window.location.href = session.checkout_url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <div className="grid max-w-lg gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Stripe Connect</CardTitle>
            <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
              Customer payments and payouts — status: <strong>{connectStatus}</strong>
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/settings/integrations" className="text-sm text-[var(--brand-accent)]">
              Manage in Integrations →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade or activate billing</CardTitle>
            <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
              Secure checkout powered by Stripe. Mock mode enabled in development.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="form-error">{error}</p>}
            <Button onClick={startCheckout} disabled={loading} className="w-full">
              {loading ? "Redirecting…" : "Open checkout"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
