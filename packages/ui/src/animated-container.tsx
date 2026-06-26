import type { HTMLAttributes, ReactNode } from "react";

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ff-fade-in-up {
      from { opacity: 0; transform: translateY(1rem); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ff-animate-in {
      animation: ff-fade-in-up 0.6s ease-out both;
      animation-timeline: view();
      animation-range: entry 0% entry 40%;
    }
    @media (prefers-reduced-motion: reduce) {
      .ff-animate-in { animation: none; opacity: 1; transform: none; }
    }
  `;
  document.head.appendChild(style);
}

export function AnimatedContainer({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  injectStyles();
  return (
    <div className={`ff-animate-in ${className}`} {...props}>
      {children}
    </div>
  );
}
