"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicQuote } from "@fieldforge/sdk";
import { FieldForgeClient } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { useBrand } from "@/components/brand-provider";
import { formatCents } from "@/lib/use-app-page";

import { API_URL } from "@/lib/api-url";

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

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PublicQuoteView({ token }: { token: string }) {
  const brand = useBrand();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const client = new FieldForgeClient(API_URL);

  const load = useCallback(async () => {
    const data = await client.getPublicQuote(token);
    setQuote(data);
    setAccepted(data.status === "accepted");
  }, [token]);

  useEffect(() => {
    load()
      .catch(() => setError("This quote is unavailable or has expired."))
      .finally(() => setLoading(false));
  }, [load]);

  async function onAccept() {
    setActing(true);
    setError("");
    try {
      await client.acceptPublicQuote(token);
      setAccepted(true);
      await load();
    } catch {
      setError("Unable to accept this quote. Please contact the sender.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="auth-split">
        <PortalBrandPanel companyName={brand.name} />
        <div className="auth-form-panel">
          <div className="flex items-center gap-2 text-sm text-[var(--brand-text-muted)]">
            <IconSpinner />
            Loading your quote…
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="auth-split">
        <PortalBrandPanel companyName={brand.name} />
        <div className="auth-form-panel">
          <Card className="auth-card w-full max-w-md">
            <CardHeader>
              <CardTitle>Quote unavailable</CardTitle>
              <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
                {error || "This link may be invalid or the quote is no longer active."}
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const statusTone =
    quote.status === "accepted" ? "success" : quote.status === "sent" ? "default" : "warning";

  return (
    <div className="auth-split">
      <PortalBrandPanel companyName={quote.company_name} customerName={quote.customer_name} />
      <div className="auth-form-panel app-mesh">
        <div className="w-full max-w-2xl page-enter">
          <div className="auth-mobile-brand mb-6 lg:hidden">
            <span className="text-lg font-bold tracking-tight text-[var(--brand-text-primary)]">
              {quote.company_name}
            </span>
          </div>

          <Card className="shadow-xl">
            <CardHeader className="border-b border-[var(--brand-border)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
                    Proposal
                  </p>
                  <CardTitle className="mt-1 text-2xl">{quote.title}</CardTitle>
                  {quote.customer_name && (
                    <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
                      Prepared for {quote.customer_name}
                    </p>
                  )}
                </div>
                <Badge tone={statusTone}>{quote.status}</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {quote.lines.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-secondary)]">No line items.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--brand-border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] text-left text-[var(--brand-text-muted)]">
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Qty</th>
                        <th className="px-4 py-3 font-medium">Rate</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.lines.map((line, i) => {
                        const lineTotal = Math.round(line.quantity * line.unit_price_cents);
                        return (
                          <tr
                            key={line.id}
                            className="border-b border-[var(--brand-border)] last:border-0 stagger-item"
                            style={{ animationDelay: `${i * 40}ms` }}
                          >
                            <td className="px-4 py-3">{line.description}</td>
                            <td className="px-4 py-3">{line.quantity}</td>
                            <td className="px-4 py-3">{formatCents(line.unit_price_cents)}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCents(lineTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-xl bg-[var(--brand-surface-elevated)] p-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--brand-text-muted)]">Subtotal</span>
                  <span>{formatCents(quote.subtotal_cents)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-[var(--brand-border)] pt-3 text-xl font-semibold tracking-tight">
                  <span>Total</span>
                  <span className="text-[var(--brand-primary)]">{formatCents(quote.total_cents)}</span>
                </div>
              </div>

              {accepted ? (
                <div className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--brand-success)_25%,transparent)] bg-[var(--brand-success-subtle)] px-4 py-4 text-sm text-[var(--brand-success)]">
                  <IconCheck className="shrink-0" />
                  <div>
                    <p className="font-semibold">Quote accepted</p>
                    <p className="mt-0.5 text-[var(--brand-text-secondary)]">
                      {quote.company_name} has been notified. They will follow up with next steps.
                    </p>
                  </div>
                </div>
              ) : quote.status === "sent" ? (
                <div className="space-y-3">
                  {error && <p className="form-error">{error}</p>}
                  <Button className="w-full" size="lg" onClick={onAccept} disabled={acting}>
                    {acting ? (
                      <span className="inline-flex items-center gap-2">
                        <IconSpinner />
                        Accepting…
                      </span>
                    ) : (
                      "Accept quote"
                    )}
                  </Button>
                  <p className="text-center text-xs text-[var(--brand-text-muted)]">
                    By accepting, you agree to the scope and pricing shown above.
                  </p>
                </div>
              ) : null}

              <p className="text-center text-xs text-[var(--brand-text-muted)]">
                Powered by {brand.name}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PortalBrandPanel({
  companyName,
  customerName,
}: {
  companyName: string;
  customerName?: string;
}) {
  const brand = useBrand();

  return (
    <div className="auth-brand-panel">
      <div className="relative z-10">
        <p className="text-sm font-medium uppercase tracking-wider text-white/60">Your quote from</p>
        <div className="mt-2 text-3xl font-bold tracking-tight">{companyName}</div>
        {customerName && (
          <p className="mt-4 max-w-sm text-lg font-light text-white/90">
            Hi {customerName.split(" ")[0]}, review and accept your proposal below.
          </p>
        )}
        {!customerName && (
          <p className="mt-4 max-w-sm text-lg font-light text-white/90">
            Review your proposal and accept when you are ready to move forward.
          </p>
        )}
      </div>
      <div className="relative z-10 space-y-3 text-sm text-white/70">
        <p>{brand.tagline}</p>
        <ul className="space-y-2">
          {["Transparent pricing", "Secure acceptance", "No account required"].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <IconCheck className="shrink-0 text-[var(--brand-accent-muted)]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
