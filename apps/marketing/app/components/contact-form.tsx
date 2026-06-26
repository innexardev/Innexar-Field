"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@fieldforge/ui";
import { API_URL } from "../lib/constants";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      firstName: String(data.get("firstName") ?? ""),
      lastName: String(data.get("lastName") ?? ""),
      email: String(data.get("email") ?? ""),
      company: String(data.get("company") ?? ""),
      inquiry: String(data.get("inquiry") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    try {
      const response = await fetch(`${API_URL}/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? "Unable to send your message. Please try again.");
      }

      setStatus("success");
      form.reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to send your message. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-[var(--brand-success)] bg-[var(--brand-success-subtle)] p-8 text-center">
        <p className="text-lg font-semibold text-[var(--brand-text-primary)]">Thank you for reaching out</p>
        <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">
          We received your message and will respond within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status === "error" && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--brand-error)] bg-[var(--brand-error-subtle)] px-4 py-3 text-sm text-[var(--brand-error)]"
        >
          {errorMessage}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="first-name" className="mb-1.5 block text-sm font-medium text-[var(--brand-text-primary)]">
            First name
          </label>
          <Input id="first-name" name="firstName" required autoComplete="given-name" placeholder="Jane" />
        </div>
        <div>
          <label htmlFor="last-name" className="mb-1.5 block text-sm font-medium text-[var(--brand-text-primary)]">
            Last name
          </label>
          <Input id="last-name" name="lastName" required autoComplete="family-name" placeholder="Smith" />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--brand-text-primary)]">
          Work email
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="jane@company.com" />
      </div>
      <div>
        <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-[var(--brand-text-primary)]">
          Company
        </label>
        <Input id="company" name="company" required autoComplete="organization" placeholder="Acme Field Services" />
      </div>
      <div>
        <label htmlFor="inquiry" className="mb-1.5 block text-sm font-medium text-[var(--brand-text-primary)]">
          How can we help?
        </label>
        <select
          id="inquiry"
          name="inquiry"
          required
          className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-primary)] shadow-sm outline-none transition-all duration-200 focus:border-[var(--brand-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)]"
        >
          <option value="">Select an option</option>
          <option value="demo">Request a demo</option>
          <option value="sales">Sales inquiry</option>
          <option value="support">Support</option>
          <option value="enterprise">Enterprise pricing</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-[var(--brand-text-primary)]">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          placeholder="Tell us about your team and what you are looking for..."
          className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text-primary)] shadow-sm outline-none transition-all duration-200 placeholder:text-[var(--brand-text-muted)] focus:border-[var(--brand-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)]"
        />
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
