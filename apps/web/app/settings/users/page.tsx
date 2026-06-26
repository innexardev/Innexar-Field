"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@fieldforge/ui";
import { formatErrorForUser, type WorkspaceUser } from "@fieldforge/sdk";
import { ErrorBanner } from "@/components/error-banner";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

function displayName(user: WorkspaceUser): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || user.email;
}

function roleTone(role: string): "success" | "default" {
  return role === "owner" ? "success" : "default";
}

export default function SettingsUsersPage() {
  const { client } = useAppPage();
  const t = useTranslations("modules.settingsUsers");
  const tc = useTranslations("modules.common");
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await client.listUsers();
      setUsers(result.data);
    } catch (e) {
      setError(formatErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ModulePage
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <div className="mb-4">
        <Link href="/settings" className="text-sm text-[var(--brand-accent)]">
          {tc("backToSettings")}
        </Link>
      </div>

      <ErrorBanner message={error} className="mb-4" />

      {loading ? (
        <p className="text-sm text-[var(--brand-text-secondary)]">{t("loadingUsers")}</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Workspace members</CardTitle>
            <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">
              {users.length} user{users.length !== 1 ? "s" : ""} in this workspace
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.length === 0 ? (
              <p className="text-sm text-[var(--brand-text-secondary)]">No users found.</p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-2 rounded-lg border border-[var(--brand-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-[var(--brand-text-primary)]">{displayName(user)}</p>
                    <p className="text-sm text-[var(--brand-text-secondary)]">{user.email}</p>
                    {user.created_at && (
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge tone={roleTone(user.role)}>{user.role}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </ModulePage>
  );
}
