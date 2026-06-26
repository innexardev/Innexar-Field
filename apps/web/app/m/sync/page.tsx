"use client";

import { useAuth } from "@/lib/auth-context";
import { useOfflineQueue } from "@/lib/mobile/use-offline-queue";
import { usePlatform } from "@fieldforge/platform";
import { Badge, Button, Card, CardContent } from "@fieldforge/ui";
import { removeQueueItem } from "@/lib/mobile/offline-queue";

export default function MobileSyncPage() {
  const { isOnline, isNative, platform } = usePlatform();
  const { queue, pendingCount, syncing, forceSync } = useOfflineQueue();
  const { user } = useAuth();

  return (
    <div className="mobile-page">
      <div className="mobile-page__header">
        <h1 className="mobile-page__title">Sync</h1>
        <p className="mobile-page__subtitle">Offline queue &amp; connection status</p>
      </div>

      <Card className="mobile-detail-card">
        <CardContent className="mobile-sync-status">
          <div className="mobile-sync-status__row">
            <span>Connection</span>
            <Badge tone={isOnline ? "success" : "warning"}>{isOnline ? "Online" : "Offline"}</Badge>
          </div>
          <div className="mobile-sync-status__row">
            <span>Platform</span>
            <span className="mobile-sync-status__value">
              {platform}
              {isNative ? " (native)" : ""}
            </span>
          </div>
          <div className="mobile-sync-status__row">
            <span>Pending items</span>
            <span className="mobile-sync-status__value">{pendingCount}</span>
          </div>
          {user?.email && (
            <div className="mobile-sync-status__row">
              <span>Signed in</span>
              <span className="mobile-sync-status__value">{user.email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mobile-sync-actions">
        <Button onClick={() => void forceSync()} disabled={!isOnline || syncing || pendingCount === 0}>
          {syncing ? "Syncing…" : "Force sync now"}
        </Button>
      </div>

      <h2 className="mobile-section-title">Queue</h2>
      <div className="mobile-list">
        {queue.length === 0 && (
          <div className="mobile-empty">
            <p className="mobile-empty__title">Queue empty</p>
            <p className="mobile-empty__text">Job, expense, and time updates made offline will appear here.</p>
          </div>
        )}
        {queue.map((item) => (
          <Card key={item.id} className="mobile-queue-item">
            <CardContent className="mobile-queue-item__content">
              <div className="mobile-queue-item__main">
                <span className="mobile-queue-item__label">{item.label}</span>
                <span className="mobile-queue-item__meta">
                  {item.method} · {new Date(item.createdAt).toLocaleString()}
                </span>
                {item.error && <span className="mobile-queue-item__error">{item.error}</span>}
              </div>
              <div className="mobile-queue-item__actions">
                <Badge
                  tone={
                    item.status === "failed" ? "warning" : item.status === "syncing" ? "default" : "default"
                  }
                >
                  {item.status}
                </Badge>
                {item.status === "failed" && (
                  <button type="button" className="mobile-queue-item__remove" onClick={() => removeQueueItem(item.id)}>
                    Remove
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
