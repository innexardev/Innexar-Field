"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Expense } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconReceipt } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";
import { formatCents } from "@/lib/use-app-page";

export default function ExpensesPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.expenses");
  const tc = useTranslations("modules.common");
  const [items, setItems] = useState<Expense[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (token) client.listExpenses().then((r) => setItems(r.data ?? [])).catch(console.error);
  }, [token, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    const exp = await client.createExpense({ description, amount_cents: cents, category: "general" });
    setItems((prev) => [exp, ...prev]);
    setDescription("");
    setAmount("");
  }

  async function approve(id: string) {
    const updated = await client.approveExpense(id);
    setItems((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader><CardTitle>Log expense</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_120px_auto] sm:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="exp-desc">Description</label>
              <Input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fuel — Job #1024" required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="exp-amt">Amount (USD)</label>
              <Input id="exp-amt" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="45.00" required />
            </div>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconReceipt size={28} className="text-[var(--brand-text-muted)]" /></div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
          </div>
        ) : (
          items.map((exp, i) => (
            <Card key={exp.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">{exp.description}</div>
                  <div className="text-sm text-[var(--brand-text-secondary)]">{formatCents(exp.amount_cents)} · {exp.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={exp.status === "approved" ? "success" : "warning"}>{exp.status}</Badge>
                  {exp.status === "pending" && (
                    <Button size="sm" variant="secondary" onClick={() => approve(exp.id)}>Approve</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ModulePage>
  );
}
