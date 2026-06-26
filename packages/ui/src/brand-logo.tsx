export interface BrandLogoProps {
  /** Full horizontal logo URL, e.g. /brand/innexarfield.svg */
  src: string;
  alt: string;
  height?: number;
  className?: string;
  /** Light surfaces vs dark primary sidebar / auth panel. */
  variant?: "default" | "onPrimary";
}

/** Innexar Field wordmark — single SVG img with correct aspect ratio (~184×52). */
export function BrandLogo({
  src,
  alt,
  height = 32,
  className = "",
  variant = "default",
}: BrandLogoProps) {
  const filter = variant === "onPrimary" ? "brightness(0) invert(1)" : undefined;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      height={height}
      style={{
        height,
        width: "auto",
        maxWidth: "100%",
        objectFit: "contain",
        filter,
      }}
    />
  );
}
