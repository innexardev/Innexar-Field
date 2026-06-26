"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Crew, CrewMember, Employee } from "@fieldforge/sdk";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, IconUsers } from "@fieldforge/ui";
import { ModulePage } from "@/components/module-page";
import { useAppPage } from "@/lib/use-app-page";

function employeeName(emp: Pick<Employee, "first_name" | "last_name" | "email" | "id">) {
  return `${emp.first_name} ${emp.last_name}`.trim() || emp.email || emp.id.slice(0, 8);
}

function memberName(member: CrewMember) {
  return `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || member.email || member.employee_id.slice(0, 8);
}

export default function CrewsPage() {
  const { client, token } = useAppPage();
  const t = useTranslations("modules.crews");
  const tc = useTranslations("modules.common");
  const [crews, setCrews] = useState<Crew[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [membersByCrew, setMembersByCrew] = useState<Record<string, CrewMember[]>>({});
  const [expandedCrewId, setExpandedCrewId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Record<string, string>>({});
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [leadName, setLeadName] = useState("");
  const [memberCount, setMemberCount] = useState("3");
  const [skills, setSkills] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([client.listCrews(), client.listEmployees()])
      .then(([crewRes, employeeRes]) => {
        setCrews(crewRes.data ?? []);
        setEmployees(employeeRes.data ?? []);
      })
      .catch(console.error);
  }, [token, client]);

  const activeEmployees = useMemo(
    () => employees.filter((emp) => emp.status === "active"),
    [employees],
  );

  const loadMembers = useCallback(
    async (crewId: string) => {
      const res = await client.listCrewMembers(crewId);
      setMembersByCrew((prev) => ({ ...prev, [crewId]: res.data ?? [] }));
    },
    [client],
  );

  async function toggleMembers(crewId: string) {
    if (expandedCrewId === crewId) {
      setExpandedCrewId(null);
      return;
    }
    setExpandedCrewId(crewId);
    if (!membersByCrew[crewId]) {
      await loadMembers(crewId).catch(console.error);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const crew = await client.createCrew({
      name,
      lead_name: leadName || undefined,
      member_count: Number(memberCount) || 1,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setCrews((prev) => [...prev, crew].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setLeadName("");
    setMemberCount("3");
    setSkills("");
  }

  async function onAddMember(e: React.FormEvent, crewId: string) {
    e.preventDefault();
    const employeeId = selectedEmployee[crewId];
    if (!employeeId) return;
    setAddingMember(crewId);
    try {
      const member = await client.addCrewMember(crewId, { employee_id: employeeId });
      setMembersByCrew((prev) => ({
        ...prev,
        [crewId]: [...(prev[crewId] ?? []), member],
      }));
      setCrews((prev) =>
        prev.map((crew) =>
          crew.id === crewId ? { ...crew, member_count: (crew.member_count ?? 0) + 1 } : crew,
        ),
      );
      setSelectedEmployee((prev) => ({ ...prev, [crewId]: "" }));
    } finally {
      setAddingMember(null);
    }
  }

  async function onRemoveMember(crewId: string, employeeId: string) {
    await client.removeCrewMember(crewId, employeeId);
    setMembersByCrew((prev) => ({
      ...prev,
      [crewId]: (prev[crewId] ?? []).filter((m) => m.employee_id !== employeeId),
    }));
    setCrews((prev) =>
      prev.map((crew) =>
        crew.id === crewId ? { ...crew, member_count: Math.max(0, (crew.member_count ?? 0) - 1) } : crew,
      ),
    );
  }

  function availableEmployees(crewId: string) {
    const assigned = new Set((membersByCrew[crewId] ?? []).map((m) => m.employee_id));
    return activeEmployees.filter((emp) => !assigned.has(emp.id));
  }

  return (
    <ModulePage title={t("title")} subtitle={t("subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle>{t("addTitle")}</CardTitle>
          <p className="mt-1 text-sm text-[var(--brand-text-secondary)]">{t("addDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="form-field">
              <label className="form-label" htmlFor="crew-name">{tc("name")}</label>
              <Input
                id="crew-name"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="crew-lead">{t("lead")}</label>
              <Input
                id="crew-lead"
                placeholder={t("leadPlaceholder")}
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="crew-size">{t("members")}</label>
              <Input
                id="crew-size"
                type="number"
                min={1}
                value={memberCount}
                onChange={(e) => setMemberCount(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="crew-skills">{t("skills")}</label>
              <Input
                id="crew-skills"
                placeholder={t("skillsPlaceholder")}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
            <Button type="submit" className="lg:col-span-4 lg:w-fit">{t("createCrew")}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {crews.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconUsers size={28} className="text-[var(--brand-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--brand-text-secondary)]">{t("emptyDescription")}</p>
          </div>
        ) : (
          crews.map((crew, i) => {
            const expanded = expandedCrewId === crew.id;
            const members = membersByCrew[crew.id] ?? [];
            const available = availableEmployees(crew.id);

            return (
              <Card key={crew.id} className="list-item-card stagger-item" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-info-subtle)] text-sm font-semibold text-[var(--brand-accent)]">
                        {crew.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--brand-text-primary)]">{crew.name}</div>
                        {crew.lead_name && (
                          <div className="text-sm text-[var(--brand-text-secondary)]">
                            {t("leadLabel", { name: crew.lead_name })}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {crew.skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-[var(--brand-surface-elevated)] px-2 py-0.5 text-xs text-[var(--brand-text-muted)]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-[var(--brand-text-muted)]">
                        {t("memberCount", { count: crew.member_count })}
                      </span>
                      <Badge tone={crew.status === "active" ? "success" : "default"}>
                        {crew.status.replace(/_/g, " ")}
                      </Badge>
                      <Button type="button" variant="secondary" size="sm" onClick={() => toggleMembers(crew.id)}>
                        {expanded ? t("hideMembers") : t("manageMembers")}
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 border-t border-[var(--brand-border)] pt-4">
                      <form
                        onSubmit={(e) => onAddMember(e, crew.id)}
                        className="mb-4 flex flex-wrap items-end gap-3"
                      >
                        <div className="form-field min-w-[220px] flex-1">
                          <label className="form-label" htmlFor={`crew-member-${crew.id}`}>
                            {t("addMember")}
                          </label>
                          <select
                            id={`crew-member-${crew.id}`}
                            className="form-input w-full"
                            value={selectedEmployee[crew.id] ?? ""}
                            onChange={(e) =>
                              setSelectedEmployee((prev) => ({ ...prev, [crew.id]: e.target.value }))
                            }
                          >
                            <option value="">{t("selectEmployee")}</option>
                            {available.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {employeeName(emp)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!selectedEmployee[crew.id] || addingMember === crew.id}
                        >
                          {addingMember === crew.id ? tc("saving") : tc("add")}
                        </Button>
                      </form>

                      {members.length === 0 ? (
                        <p className="text-sm text-[var(--brand-text-muted)]">{t("noMembers")}</p>
                      ) : (
                        <ul className="space-y-2">
                          {members.map((member) => (
                            <li
                              key={member.employee_id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--brand-border)] px-3 py-2"
                            >
                              <div>
                                <div className="text-sm font-medium">{memberName(member)}</div>
                                {member.email && (
                                  <div className="text-xs text-[var(--brand-text-muted)]">{member.email}</div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => onRemoveMember(crew.id, member.employee_id)}
                              >
                                {tc("remove")}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </ModulePage>
  );
}
