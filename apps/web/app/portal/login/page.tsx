"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { AuthBrandPanel, AuthMobileBrand } from "@/components/auth-brand-panel";
import { ErrorBanner } from "@/components/error-banner";
import { useBrand } from "@/components/brand-provider";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
import { formatErrorForUser } from "@fieldforge/sdk";
import { usePortalAuth } from "@/lib/portal-auth-context";

function IconSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

function PortalLoginForm() {
  const brand = useBrand();
  const t = useTranslations("modules.portal.login");
  const tc = useTranslations("common");
  const { token, requestMagicLink, verifyToken } = usePortalAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      router.replace("/portal/invoices");
    }
  }, [token, router]);

  useEffect(() => {
    const magicToken = searchParams.get("token");
    if (!magicToken || token) return;

    let cancelled = false;
    setLoading(true);
    verifyToken(magicToken)
      .then(() => {
        if (!cancelled) router.replace("/portal/invoices");
      })
      .catch((err) => {
        if (!cancelled) setError(formatErrorForUser(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, token, verifyToken, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSent(false);
    setDevLink(null);
    try {
      const res = await requestMagicLink(email, tenantSlug);
      setSent(true);
      if (res.devLoginUrl) {
        setDevLink(res.devLoginUrl);
      }
    } catch (err) {
      setError(formatErrorForUser(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      <AuthBrandPanel variant="login" />
      <div className="auth-form-panel relative">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher variant="header" />
        </div>
        <div className="w-full max-w-md">
          <AuthMobileBrand />
          <Card className="auth-card">
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
              <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
                {t("subtitle", { brand: brand.name })}
              </p>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--brand-text-secondary)]">{t("linkSent")}</p>
                  {devLink ? (
                    <p className="text-sm">
                      <span className="text-[var(--brand-text-secondary)]">{t("devLink")} </span>
                      <Link href={devLink} className="text-[var(--brand-accent)] underline">
                        {t("devLinkAction")}
                      </Link>
                    </p>
                  ) : null}
                  <Button type="button" variant="secondary" onClick={() => setSent(false)}>
                    {t("tryAgain")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="form-field">
                    <label className="form-label" htmlFor="portal-email">
                      {tc("email")}
                    </label>
                    <Input
                      id="portal-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="portal-company">
                      {t("companySlug")}
                    </label>
                    <Input
                      id="portal-company"
                      type="text"
                      value={tenantSlug}
                      onChange={(e) => setTenantSlug(e.target.value)}
                      placeholder="acme-cleaning"
                      required
                      disabled={loading}
                      autoComplete="organization"
                    />
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{t("companySlugHint")}</p>
                  </div>
                  <ErrorBanner message={error} />
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <IconSpinner />
                        {t("sending")}
                      </span>
                    ) : (
                      t("sendLink")
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <PortalLoginForm />
    </Suspense>
  );
}
