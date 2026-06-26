"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatErrorForUser } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { ErrorBanner } from "@/components/error-banner";
import { useBrand } from "@/components/brand-provider";
import { BrandLogo } from "@fieldforge/ui";
import { useAuth } from "@/lib/auth-context";

export default function BillingDunningPage() {
  const t = useTranslations("billing.dunning");
  const brand = useBrand();
  const { client, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void client.getBillingStatus().then((status) => {
      if (!status.requires_dunning) {
        window.location.replace("/dashboard");
      }
    });
  }, [client]);

  async function updatePayment() {
    setLoading(true);
    setError("");
    const origin = window.location.origin;
    try {
      const portal = await client.createBillingPortal(`${origin}/billing/dunning`);
      if (portal.portal_url) {
        window.location.href = portal.portal_url;
        return;
      }
    } catch (err) {
      try {
        const session = await client.createCheckout({
          success_url: `${origin}/billing/success`,
          cancel_url: `${origin}/billing/dunning`,
        });
        if (session.checkout_url) {
          window.location.href = session.checkout_url;
          return;
        }
      } catch (checkoutErr) {
        setError(formatErrorForUser(checkoutErr));
        return;
      }
      setError(formatErrorForUser(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--brand-background-subtle)] p-6">
      <BrandLogo src={brand.logo.wordmark} alt={brand.name} height={36} className="mb-8" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ErrorBanner message={error} />
          <Button onClick={updatePayment} disabled={loading} className="w-full">
            {loading ? t("redirecting") : t("updatePayment")}
          </Button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full text-center text-sm text-[var(--brand-text-secondary)] hover:underline"
          >
            {t("signOut")}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
