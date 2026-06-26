"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { AuthBrandPanel, AuthMobileBrand } from "@/components/auth-brand-panel";
import { ErrorBanner } from "@/components/error-banner";
import { useBrand } from "@/components/brand-provider";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";
import { formatErrorForUser } from "@fieldforge/sdk";
import { useAuth } from "@/lib/auth-context";

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

export default function LoginPage() {
  const brand = useBrand();
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
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
              <CardTitle>{t("welcomeBack")}</CardTitle>
              <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
                {t("signInSubtitle", { brand: brand.name })}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="form-field">
                  <label className="form-label" htmlFor="email">
                    {tc("email")}
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    disabled={loading}
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
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
                <ErrorBanner message={error} />
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <IconSpinner className="mr-2" />
                      {t("signingIn")}
                    </>
                  ) : (
                    t("signIn")
                  )}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-[var(--brand-text-secondary)]">
                {t("noAccount")}{" "}
                <Link href="/signup" className="font-medium text-[var(--brand-accent)] hover:underline">
                  {t("startFreeTrial")}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
