"use client";

import type { ComponentType, ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";

export function DataTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
  actionsLabel = "Actions",
  emptyMessage,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: { id: string; cells: Record<string, ReactNode>; actions?: ReactNode }[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyIcon?: ComponentType<{ size?: number; className?: string }>;
  actionsLabel?: string;
  /** @deprecated Use emptyTitle */
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle ?? emptyMessage ?? "No records found"}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const hasActions = rows.some((r) => r.actions);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-sm">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.label}
              </th>
            ))}
            {hasActions && <th className="text-right">{actionsLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {row.cells[col.key]}
                </td>
              ))}
              {hasActions && (
                <td className="text-right">
                  <div className="flex justify-end gap-1.5">{row.actions}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
