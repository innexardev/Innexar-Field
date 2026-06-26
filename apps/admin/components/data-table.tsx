"use client";

import type { ReactNode } from "react";

export function DataTable({
  columns,
  rows,
  emptyMessage = "No records found.",
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: { id: string; cells: Record<string, ReactNode>; actions?: ReactNode }[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--brand-text-secondary)]">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)]">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.label}
              </th>
            ))}
            {rows.some((r) => r.actions) && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {row.cells[col.key]}
                </td>
              ))}
              {row.actions && <td className="text-right">{row.actions}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
