"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { LogoUpload } from "@/components/onboarding/logo-upload";
import { ErrorBanner } from "@/components/error-banner";
import { useOnboarding } from "@/lib/onboarding/use-onboarding";
import { nextStep, prevStep, stepPath } from "@/lib/onboarding/steps";
import { readSignupSeed } from "@/lib/onboarding/storage";
import { formatErrorForUser } from "@fieldforge/sdk";
import { useAuth } from "@/lib/auth-context";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

const TEAM_SIZES = [
  { value: "1", label: "Just me" },
  { value: "2-5", label: "2–5 people" },
  { value: "6-15", label: "6–15 people" },
  { value: "16-50", label: "16–50 people" },
  { value: "50+", label: "50+ people" },
];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { client } = useAuth();
  const { state, saveProfile, goToStep, saving, error, clearError } = useOnboarding();
  const [companyState, setCompanyState] = useState("");
  const [teamSize, setTeamSize] = useState("1");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const seed = readSignupSeed();

  useEffect(() => {
    if (state && state.currentStep !== "profile") goToStep("profile");
  }, [state, goToStep]);

  useEffect(() => {
    if (state) {
      setCompanyState(state.profile.companyState);
      setTeamSize(state.profile.teamSize);
      setLogoUrl(state.profile.logoUrl);
    }
  }, [state]);

  function onBack() {
    const prev = prevStep("profile");
    if (prev) {
      goToStep(prev);
      router.push(stepPath(prev));
    }
  }

  async function onUploadLogo(file: File) {
    setUploadingLogo(true);
    setUploadError(null);
    clearError();
    try {
      const result = await client.uploadTenantLogo(file);
      setLogoUrl(result.logo_url);
    } catch (err) {
      setUploadError(formatErrorForUser(err));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    try {
      await saveProfile({ companyState, teamSize, logoUrl });
      const nxt = nextStep("profile");
      if (nxt) {
        goToStep(nxt);
        router.push(stepPath(nxt));
      }
    } catch {
      /* error surfaced via hook */
    }
  }

  return (
    <OnboardingShell step="profile">
      <div className="onboarding-content onboarding-content--narrow">
        <header className="onboarding-page-header">
          <h1 className="onboarding-title">Tell us about your company</h1>
          <p className="onboarding-subtitle">
            {seed?.company_name ? (
              <>
                Setting up <strong>{seed.company_name}</strong> — we use this for tax defaults and team sizing.
              </>
            ) : (
              "We use this for sales tax defaults, reporting, and team recommendations."
            )}
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onContinue} className="space-y-5">
              <ErrorBanner message={error ?? uploadError} />
              <div className="form-field">
                <label className="form-label" htmlFor="state">
                  Primary state of operation
                </label>
                <select
                  id="state"
                  className="form-select"
                  value={companyState}
                  onChange={(e) => setCompanyState(e.target.value)}
                  required
                >
                  <option value="">Select state…</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="form-hint">Used for sales tax and compliance defaults (USD)</p>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="team-size">
                  Team size
                </label>
                <select
                  id="team-size"
                  className="form-select"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  required
                >
                  {TEAM_SIZES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <LogoUpload
                logoUrl={logoUrl}
                uploading={uploadingLogo}
                onLogoUrlChange={setLogoUrl}
                onUpload={onUploadLogo}
              />

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                <Button type="button" variant="ghost" onClick={onBack}>
                  Back
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Continue"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </OnboardingShell>
  );
}
