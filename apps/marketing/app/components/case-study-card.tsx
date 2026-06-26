"use client";

import type { CaseStudy } from "../lib/marketing-content";

type CaseStudyCardProps = {
  study: CaseStudy;
};

export function CaseStudyCard({ study }: CaseStudyCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--brand-border)] bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--brand-text-muted)]">
        <span className="font-semibold text-[var(--brand-text-primary)]">{study.company}</span>
        <span aria-hidden="true">·</span>
        <span>{study.location}</span>
        <span aria-hidden="true">·</span>
        <span>{study.teamSize}</span>
      </div>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-[var(--brand-text-primary)]">{study.headline}</h3>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">Challenge</h4>
          <p className="mt-2 text-sm leading-relaxed text-[var(--brand-text-secondary)]">{study.challenge}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">Solution</h4>
          <p className="mt-2 text-sm leading-relaxed text-[var(--brand-text-secondary)]">{study.solution}</p>
        </div>
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        {study.results.map((result) => (
          <div
            key={result.label}
            className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-4 py-3 text-center"
          >
            <dt className="text-xs font-medium text-[var(--brand-text-muted)]">{result.label}</dt>
            <dd className="mt-1 text-2xl font-bold text-[var(--brand-accent)]">{result.value}</dd>
          </div>
        ))}
      </dl>

      <blockquote className="mt-8 border-l-4 border-[var(--brand-accent)] pl-5">
        <p className="text-[var(--brand-text-secondary)] italic leading-relaxed">&ldquo;{study.quote}&rdquo;</p>
        <footer className="mt-3 text-sm font-medium text-[var(--brand-text-primary)]">— {study.author}</footer>
      </blockquote>
    </article>
  );
}
