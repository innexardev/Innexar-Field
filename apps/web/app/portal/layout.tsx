import type { ReactNode } from "react";
import { PortalAuthGuard } from "@/components/portal-auth-guard";
import { PortalAuthProvider } from "@/lib/portal-auth-context";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalAuthProvider>
      <PortalAuthGuard>{children}</PortalAuthGuard>
    </PortalAuthProvider>
  );
}
