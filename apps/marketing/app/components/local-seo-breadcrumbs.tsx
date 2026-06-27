import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function LocalSeoBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-6 pt-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--brand-text-muted)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-[var(--brand-accent)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-[var(--brand-text-secondary)]" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
