"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@fieldforge/ui";

export interface TourStep {
  target: string;
  title: string;
  body: string;
}

export function GuidedTour({
  steps,
  active,
  onFinish,
}: {
  steps: TourStep[];
  active: boolean;
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[index];

  const measure = useCallback(() => {
    if (!active || !step) return;
    const el = document.querySelector(step.target);
    if (el) setRect(el.getBoundingClientRect());
    else setRect(null);
  }, [active, step]);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      setRect(null);
      return;
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, index, measure]);

  if (!active || !step) return null;

  function next() {
    if (index >= steps.length - 1) onFinish();
    else setIndex((i) => i + 1);
  }

  function skip() {
    onFinish();
  }

  const pad = 8;
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  return (
    <div className="guided-tour" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="guided-tour__backdrop" onClick={skip} aria-hidden />
      {spotlight && (
        <div
          className="guided-tour__spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}
      <div className="guided-tour__card page-enter">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-accent)]">
          Step {index + 1} of {steps.length}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--brand-text-primary)]">{step.title}</h2>
        <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{step.body}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={next}>
            {index >= steps.length - 1 ? "Finish tour" : "Next"}
          </Button>
          <Button type="button" variant="ghost" onClick={skip}>
            Skip tour
          </Button>
        </div>
      </div>
    </div>
  );
}
