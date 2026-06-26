import type { ReactNode } from "react";

export function PageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="hero-mesh">
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 text-center md:pb-20 md:pt-24">
        <h1 className="fade-in text-4xl font-bold leading-tight tracking-tight text-[var(--brand-primary)] md:text-5xl md:leading-[1.1]">
          {title}
        </h1>
        {subtitle && (
          <p className="fade-in-delay-1 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--brand-text-secondary)] md:text-xl">
            {subtitle}
          </p>
        )}
        {children && <div className="fade-in-delay-2 mt-8">{children}</div>}
      </div>
    </section>
  );
}
