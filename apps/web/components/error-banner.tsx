export function ErrorBanner({
  message,
  className = "",
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p className={`form-error${className ? ` ${className}` : ""}`} role="alert">
      {message}
    </p>
  );
}
