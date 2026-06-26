"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@fieldforge/i18n";
import { AuthBrandPanel, AuthMobileBrand } from "@/components/auth-brand-panel";
import { ErrorBanner } from "@/components/error-banner";
import { IndustryPackPicker } from "@/components/industry-pack-picker";
import { PlanPicker } from "@/components/plan-picker";
import { useBrand, useConfig } from "@/components/brand-provider";
import { API_URL } from "@/lib/api-url";
import { saveSignupSeed } from "@/lib/onboarding/storage";
import { useAuth } from "@/lib/auth-context";
import {
  captureSignupAttributionFromLocation,
  hasSignupAttribution,
  loadSignupAttribution,
  type SignupAttribution,
} from "@fieldforge/platform";
import { formatErrorForUser, type SignupMetadata } from "@fieldforge/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@fieldforge/ui";

function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

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

function resolvePackParam(pack: string | null): string {
  if (!pack) return "field-services";
  const normalized = pack === "cleaning" ? "cleaning" : pack;
  return ["cleaning", "construction", "field-services"].includes(normalized)
    ? normalized
    : "field-services";
}

function toSignupMetadata(attribution: SignupAttribution): SignupMetadata | undefined {
  if (!hasSignupAttribution(attribution)) {
    return undefined;
  }
  return {
    ref: attribution.ref,
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_term: attribution.utm_term,
    utm_content: attribution.utm_content,
  };
}

function SignupForm() {
  const brand = useBrand();
  const { pricing } = useConfig();
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { signup } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    company_name: "",
    email: "",
    password: "",
    industry_pack: resolvePackParam(params.get("pack")),
    plan_id: params.get("plan") ?? "starter",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<SignupMetadata | undefined>();

  useEffect(() => {
    captureSignupAttributionFromLocation(window.location.search);
    setMetadata(toSignupMetadata(loadSignupAttribution()));
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup({ ...form, metadata });
      saveSignupSeed({
        industry_pack: form.industry_pack,
        plan_id: form.plan_id,
        company_name: form.company_name,
      });
      router.push("/onboarding/billing");
    } catch (err) {
      setError(formatErrorForUser(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="auth-card auth-card--wide auth-card--signup" variant="elevated">
      <CardHeader className="px-5 py-3">
        <div className="space-y-2">
          <div className="auth-journey-step">
            <span className="auth-journey-step__dot" aria-hidden />
            {t("signupStep")}
          </div>
          <div>
            <CardTitle className="text-base">{t("signupTitle", { days: pricing.trial_days })}</CardTitle>
            <p className="mt-1 text-xs text-[var(--brand-text-secondary)]">
              {t("signupSubtitle", { brand: brand.name })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 px-5 py-3">
        <form onSubmit={onSubmit} className="auth-form">
          <section className="form-section">
            <h2 className="form-section__title">{t("companyDetails")}</h2>
            <div className="space-y-2.5">
              <div className="form-field">
                <label className="form-label" htmlFor="company_name">
                  {t("companyName")}
                </label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Acme Field Services"
                  required
                  disabled={loading}
                  autoComplete="organization"
                />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="form-field">
                  <label className="form-label" htmlFor="work_email">
                    {t("workEmail")}
                  </label>
                  <Input
                    id="work_email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={t("passwordHint")}
                    minLength={8}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="form-section">
            <IndustryPackPicker
              value={form.industry_pack}
              onChange={(industry_pack) => setForm({ ...form, industry_pack })}
              apiBase={API_URL}
            />
          </section>

          <section className="form-section">
            <PlanPicker
              fallbackPlans={pricing.plans}
              apiBase={API_URL}
              value={form.plan_id}
              onChange={(plan_id) => setForm({ ...form, plan_id })}
            />
          </section>

          <ErrorBanner message={error} />

          <div className="auth-cta-block">
            <Button
              type="submit"
              className="auth-cta-button w-full"
              disabled={loading}
              aria-label="Create workspace"
            >
              {loading ? (
                <>
                  <IconSpinner className="mr-2" />
                  {t("creatingWorkspace")}
                </>
              ) : (
                <>
                  {t("createWorkspace")}
                  <IconArrowRight className="ml-2" />
                </>
              )}
            </Button>
            <p className="auth-cta-subtext">
              {t("signupFootnote", { days: pricing.trial_days })}
            </p>
          </div>
        </form>
        <p className="auth-form-divider mt-4 pt-4 text-center text-xs text-[var(--brand-text-secondary)]">
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-medium text-[var(--brand-accent)] hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function SignupFormFallback() {
  return (
    <Card className="auth-card auth-card--wide" variant="elevated">
      <CardContent className="py-16">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-accent)]" />
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="auth-split auth-split--signup">
      <AuthBrandPanel variant="signup" />
      <div className="auth-form-panel auth-form-panel--signup relative">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher variant="header" />
        </div>
        <div className="w-full max-w-2xl">
          <AuthMobileBrand />
          <Suspense fallback={<SignupFormFallback />}>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
