"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconCreditCard,
  IconFileText,
  IconUsers,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
} from "@fieldforge/ui";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ErrorBanner } from "@/components/error-banner";
import { useOnboarding } from "@/lib/onboarding/use-onboarding";
import { useAppPage } from "@/lib/use-app-page";
import { formatErrorForUser } from "@fieldforge/sdk";
import { nextStep, prevStep, stepPath } from "@/lib/onboarding/steps";

export default function OnboardingSetupPage() {
  const router = useRouter();
  const { client } = useAppPage();
  const { state, skipSetup, saveSetup, goToStep, saving, error } = useOnboarding();
  const [inviteInput, setInviteInput] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<string>("disconnected");
  const [stripeError, setStripeError] = useState("");

  useEffect(() => {
    if (state && state.currentStep !== "setup") goToStep("setup");
  }, [state, goToStep]);

  useEffect(() => {
    if (state?.setup?.inviteEmails) setInvites(state.setup.inviteEmails ?? []);
  }, [state]);

  useEffect(() => {
    void client.getStripeConnectStatus().then((st) => setStripeStatus(st.status)).catch(() => undefined);
  }, [client]);

  async function connectStripe() {
    setStripeLoading(true);
    setStripeError("");
    try {
      const result = await client.startStripeConnectOnboarding("/onboarding/setup");
      if (result.mock) {
        await client.completeStripeConnect(result.account_id);
        setStripeStatus("connected");
        return;
      }
      window.location.href = result.onboarding_url;
    } catch (e) {
      setStripeError(formatErrorForUser(e));
    } finally {
      setStripeLoading(false);
    }
  }

  function addInvite() {
    const email = inviteInput.trim().toLowerCase();
    if (!email || !email.includes("@") || invites.includes(email)) return;
    setInvites((prev) => [...prev, email]);
    setInviteInput("");
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((e) => e !== email));
  }

  function onBack() {
    const prev = prevStep("setup");
    if (prev) {
      goToStep(prev);
      router.push(stepPath(prev));
    }
  }

  async function onSkip() {
    if (saving) return;
    try {
      await skipSetup({ stripeSkipped: true, csvSkipped: true, inviteEmails: invites });
      const nxt = nextStep("setup");
      if (nxt) {
        goToStep(nxt);
        router.push(stepPath(nxt));
      }
    } catch {
      /* error surfaced via hook */
    }
  }

  async function onContinue() {
    if (saving) return;
    try {
      await saveSetup({ stripeSkipped: false, csvSkipped: false, inviteEmails: invites });
      const nxt = nextStep("setup");
      if (nxt) {
        goToStep(nxt);
        router.push(stepPath(nxt));
      }
    } catch {
      /* error surfaced via hook */
    }
  }

  return (
    <OnboardingShell step="setup">
      <div className="onboarding-content">
        <header className="onboarding-page-header">
          <h1 className="onboarding-title">Quick setup</h1>
          <p className="onboarding-subtitle">
            Optional shortcuts to hit the ground running. You can complete these anytime from Settings.
          </p>
        </header>

        <ErrorBanner message={error} className="mb-4" />

        <div className="onboarding-setup-grid">
          <Card className="onboarding-setup-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-info-subtle)] text-[var(--brand-accent)]">
                  <IconCreditCard size={22} />
                </div>
                <Badge tone={stripeStatus === "connected" ? "success" : "warning"}>
                  {stripeStatus === "connected" ? "Connected" : "Optional"}
                </Badge>
              </div>
              <CardTitle className="mt-3">Connect Stripe</CardTitle>
              <p className="text-sm text-[var(--brand-text-secondary)]">
                Accept card payments and sync payouts with invoicing. Wired to billing via Stripe Connect.
              </p>
            </CardHeader>
            <CardContent>
              {stripeError && <p className="form-error mb-2">{stripeError}</p>}
              <Button
                variant={stripeStatus === "connected" ? "secondary" : "primary"}
                className="w-full"
                disabled={stripeLoading || stripeStatus === "connected"}
                onClick={() => void connectStripe()}
              >
                {stripeLoading ? "Connecting…" : stripeStatus === "connected" ? "Stripe connected" : "Connect Stripe account"}
              </Button>
              <p className="mt-2 text-xs text-[var(--brand-text-muted)]">
                Mock mode in development — also manage subscription in{" "}
                <a href="/billing" className="text-[var(--brand-accent)]">
                  Billing
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="onboarding-setup-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-info-subtle)] text-[var(--brand-accent)]">
                  <IconFileText size={22} />
                </div>
                <Badge tone="warning">Coming soon</Badge>
              </div>
              <CardTitle className="mt-3">Import customers (CSV)</CardTitle>
              <p className="text-sm text-[var(--brand-text-secondary)]">
                Upload a spreadsheet to migrate existing client records.
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" disabled>
                Upload CSV file
              </Button>
              <p className="mt-2 text-xs text-[var(--brand-text-muted)]">Supports name, email, phone, address columns</p>
            </CardContent>
          </Card>

          <Card className="onboarding-setup-card onboarding-setup-card--wide">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-info-subtle)] text-[var(--brand-accent)]">
                <IconUsers size={22} />
              </div>
              <CardTitle className="mt-3">Invite your team</CardTitle>
              <p className="text-sm text-[var(--brand-text-secondary)]">
                Add dispatchers, field techs, or office staff — invites are saved locally until email delivery is live.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInvite())}
                  aria-label="Team member email"
                />
                <Button type="button" variant="secondary" onClick={addInvite} className="shrink-0">
                  Add invite
                </Button>
              </div>
              {invites.length > 0 && (
                <ul className="space-y-2">
                  {invites.map((email) => (
                    <li
                      key={email}
                      className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeInvite(email)}
                        className="text-[var(--brand-text-muted)] hover:text-[var(--brand-error)]"
                        aria-label={`Remove ${email}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={onSkip} disabled={saving}>
              Skip for now
            </Button>
            <Button onClick={onContinue} disabled={saving}>
              {saving ? "Saving…" : "Finish setup"}
            </Button>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
