import type { ReactNode } from "react";

export function Section({
  id,
  title,
  subtitle,
  children,
  className = "",
  containerClassName = "",
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <section id={id} className={`py-20 ${className}`}>
      <div className={`mx-auto max-w-6xl px-6 ${containerClassName}`}>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--brand-text-primary)]">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-2xl text-lg text-[var(--brand-text-secondary)]">{subtitle}</p>
          )}
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
