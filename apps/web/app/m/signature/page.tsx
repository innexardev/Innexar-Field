"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@fieldforge/ui";
import { MobileModulePage } from "@/components/mobile-module-page";
import { useAuth } from "@/lib/auth-context";

export default function MobileSignaturePage() {
  const { token } = useAuth();
  const t = useTranslations("modules.mobileSignature");
  const tc = useTranslations("modules.common");
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  return (
    <MobileModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card className="mobile-detail-card">
        <CardContent>
          <div className="mobile-photo-placeholder" role="img" aria-label="Signature pad placeholder">
            <span className="mobile-photo-placeholder__icon">✍️</span>
            <p className="mobile-photo-placeholder__text">Sign here</p>
            <p className="mobile-photo-placeholder__hint">Native signature pad ships with Capacitor</p>
          </div>
        </CardContent>
      </Card>

      <div className="mobile-empty">
        <p className="mobile-empty__title">No signatures yet</p>
        <p className="mobile-empty__text">Customer e-signature capture — stub.</p>
      </div>
    </MobileModulePage>
  );
}
