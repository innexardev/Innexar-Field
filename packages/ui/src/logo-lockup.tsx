export interface LogoLockupProps {
  iconSrc: string;
  name: string;
  shortName?: string;
  height?: number;
  className?: string;
  /** Light text on dark surfaces (e.g. primary sidebar, auth panel). */
  variant?: "default" | "onPrimary";
}

function lockupSuffix(name: string, prefix: string): string {
  if (name.startsWith(prefix)) {
    return name.slice(prefix.length).trim();
  }
  const parts = name.split(/\s+/);
  return parts.slice(1).join(" ");
}

/** Brand lockup — favicon icon left, wordmark text right (short name + accent suffix). */
export function LogoLockup({
  iconSrc,
  name,
  shortName,
  height = 32,
  className = "",
  variant = "default",
}: LogoLockupProps) {
  const prefix = shortName ?? name.split(/\s+/)[0] ?? name;
  const suffix = lockupSuffix(name, prefix);
  const nameColor =
    variant === "onPrimary" ? "var(--brand-primary-foreground)" : "var(--brand-text-primary)";
  const accentColor =
    variant === "onPrimary" ? "var(--brand-accent-muted)" : "var(--brand-accent)";
  const fontSize = Math.round(height * 0.55);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={iconSrc}
        alt=""
        aria-hidden
        height={height}
        width={height}
        style={{ height, width: height, objectFit: "contain", flexShrink: 0 }}
      />
      <span
        className="inline-flex items-baseline whitespace-nowrap leading-none"
        style={{ fontSize }}
        aria-label={name}
      >
        <span style={{ fontWeight: 700, color: nameColor }}>{prefix}</span>
        {suffix ? (
          <>
            <span aria-hidden> </span>
            <span style={{ fontWeight: 600, color: accentColor }}>{suffix}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}
