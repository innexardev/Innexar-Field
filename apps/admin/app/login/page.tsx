"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, BrandLogo } from "@fieldforge/ui";
import { formatErrorForUser } from "@fieldforge/sdk";
import { ErrorBanner } from "@/components/error-banner";
import { BRAND_NAME, DEFAULT_LOGO_WORDMARK } from "@/lib/defaults";
import { useAdminAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { admin, loading, login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && admin) {
      router.replace("/admin/dashboard");
    }
  }, [admin, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(formatErrorForUser(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || admin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--brand-text-secondary)]">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher variant="header" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo src={DEFAULT_LOGO_WORDMARK} alt={BRAND_NAME} height={40} variant="onPrimary" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-accent)]">
            {t("platformAdmin")}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--brand-text-primary)]">{t("operatorSignIn")}</h1>
          <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("operatorSubtitle")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("superAdmin")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="form-field">
                <label className="form-label" htmlFor="email">
                  {tc("email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ops@field.innexar.app"
                  required
                  disabled={submitting}
                  autoComplete="email"
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="password">
                  {tc("password")}
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="current-password"
                />
              </div>
              <ErrorBanner message={error} />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("signingIn") : t("signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
