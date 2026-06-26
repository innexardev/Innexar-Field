export interface LogoProps {
  /** Public URL, e.g. /logo.png */
  src?: string;
  alt: string;
  className?: string;
  height?: number;
}

/** Brand mark — plain <img> keeps @fieldforge/ui framework-agnostic. */
export function Logo({ src = "/logo.png", alt, className = "", height = 32 }: LogoProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      height={height}
      style={{ height, width: "auto", maxWidth: "100%" }}
    />
  );
}
