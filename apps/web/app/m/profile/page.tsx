"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, CardContent } from "@fieldforge/ui";
import { MobileModulePage } from "@/components/mobile-module-page";
import { useAuth } from "@/lib/auth-context";

export default function MobileProfilePage() {
  const { token, user } = useAuth();
  const t = useTranslations("modules.mobileProfile");
  const tc = useTranslations("modules.common");
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  return (
    <MobileModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card className="mobile-detail-card">
        <CardContent className="mobile-sync-status">
          {user?.email && (
            <div className="mobile-sync-status__row">
              <span>Signed in</span>
              <span className="mobile-sync-status__value">{user.email}</span>
            </div>
          )}
          <div className="mobile-sync-status__row">
            <span>Biometric unlock</span>
            <Badge tone="warning">Coming soon</Badge>
          </div>
          <div className="mobile-sync-status__row">
            <span>Push notifications</span>
            <Badge tone="warning">Coming soon</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="mobile-empty">
        <p className="mobile-empty__title">Profile settings</p>
        <p className="mobile-empty__text">Full tech profile and device preferences ship with native builds.</p>
      </div>
    </MobileModulePage>
  );
}
