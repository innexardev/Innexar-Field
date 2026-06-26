export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
  className?: string;
}) {
  const tones = {
    default: "bg-[var(--brand-info-subtle)] text-[var(--brand-info)]",
    success: "bg-[var(--brand-success-subtle)] text-[var(--brand-success)]",
    warning: "bg-[var(--brand-warning-subtle)] text-[var(--brand-warning)]",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
