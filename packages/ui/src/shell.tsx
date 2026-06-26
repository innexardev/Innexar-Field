"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { IconChevronDown, IconLayoutDashboard, IconLogOut, IconMenu, IconX, NavIcon } from "./icons";
import { BrandLogo } from "./brand-logo";
import { groupNavItems, type ShellNavItem } from "./nav-groups";

export const DEFAULT_SHELL_LABELS = {
  workspace: "Workspace",
  core: "Core",
  dashboard: "Dashboard",
  signOut: "Sign out",
  openNavigation: "Open navigation",
  closeNavigation: "Close navigation",
  closeMenu: "Close menu",
} as const;

export type ShellLabels = {
  [K in keyof typeof DEFAULT_SHELL_LABELS]?: string;
};

function navLinkClass(active: boolean, mobile = false) {
  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ease-out";
  if (active) {
    return `${base} bg-white/15 font-medium text-white shadow-[inset_3px_0_0_0_var(--brand-accent)]`;
  }
  if (mobile) {
    return `${base} text-[var(--brand-text-primary)] hover:bg-[var(--brand-surface-elevated)]`;
  }
  return `${base} text-white/75 hover:bg-white/10 hover:text-white`;
}

function NavLink({
  item,
  active,
  mobile,
  onNavigate,
}: {
  item: ShellNavItem;
  active: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a href={item.path} className={navLinkClass(active, mobile)} onClick={onNavigate}>
      {item.icon ? (
        <NavIcon name={item.icon} size={18} className="shrink-0 opacity-80" />
      ) : (
        <span className="h-[18px] w-[18px] shrink-0" aria-hidden />
      )}
      <span className="truncate">{item.label}</span>
    </a>
  );
}

function SidebarContent({
  brand,
  wordmarkSrc,
  nav,
  userEmail,
  onLogout,
  currentPath,
  onNavigate,
  labels,
  groupLabel,
  footerActions,
}: {
  brand: string;
  wordmarkSrc?: string;
  nav: ShellNavItem[];
  userEmail?: string;
  onLogout?: () => void;
  currentPath?: string;
  onNavigate?: () => void;
  labels: { [K in keyof typeof DEFAULT_SHELL_LABELS]: string };
  groupLabel: (englishLabel: string) => string;
  footerActions?: ReactNode;
}) {
  const safeNav = nav ?? [];
  const groups = useMemo(() => groupNavItems(safeNav), [safeNav]);
  const collapsible = safeNav.length > 8;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function isActive(path: string) {
    if (!currentPath) return false;
    if (path === "/dashboard") return currentPath === "/dashboard";
    return currentPath === path || currentPath.startsWith(`${path}/`);
  }

  function isGroupActive(items: ShellNavItem[]) {
    return items.some((item) => isActive(item.path));
  }

  function toggleGroup(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function groupIsOpen(label: string, items: ShellNavItem[]) {
    if (!collapsible) return true;
    if (collapsed[label] === false) return true;
    if (collapsed[label] === true) return false;
    return isGroupActive(items);
  }

  return (
    <>
      <div className="border-b border-white/10 px-6 py-5">
        {wordmarkSrc ? (
          <BrandLogo
            src={wordmarkSrc}
            alt={brand}
            height={28}
            variant="onPrimary"
          />
        ) : (
          <div className="text-lg font-bold tracking-tight">{brand}</div>
        )}
        <p className="mt-0.5 text-xs text-white/50">{labels.workspace}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            {labels.core}
          </p>
          <a
            href="/dashboard"
            className={navLinkClass(isActive("/dashboard"))}
            onClick={onNavigate}
          >
            <IconLayoutDashboard size={18} className="shrink-0 opacity-80" />
            <span className="truncate">{labels.dashboard}</span>
          </a>
        </div>

        {groups.map((group) => {
          const open = groupIsOpen(group.label, group.items);
          return (
            <div key={group.label} className="mt-5">
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between px-3 pb-1 text-left"
                  aria-expanded={open}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {groupLabel(group.label)}
                  </span>
                  <IconChevronDown
                    size={14}
                    className={`shrink-0 text-white/40 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>
              ) : (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {groupLabel(group.label)}
                </p>
              )}
              {open && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      item={item}
                      active={isActive(item.path)}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        {footerActions}
        {userEmail && (
          <div className="truncate rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
            {userEmail}
          </div>
        )}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <IconLogOut size={14} />
            {labels.signOut}
          </button>
        )}
      </div>
    </>
  );
}

export function Shell({
  brand,
  wordmarkSrc,
  nav,
  children,
  userEmail,
  onLogout,
  currentPath,
  headerActions,
  labels: labelsProp,
  groupLabel = (label) => label,
  sidebarFooter,
}: {
  brand: string;
  wordmarkSrc?: string;
  nav: ShellNavItem[];
  children: ReactNode;
  userEmail?: string;
  onLogout?: () => void;
  currentPath?: string;
  headerActions?: ReactNode;
  labels?: ShellLabels;
  groupLabel?: (englishLabel: string) => string;
  sidebarFooter?: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const safeNav = nav ?? [];
  const labels = { ...DEFAULT_SHELL_LABELS, ...labelsProp };

  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--brand-background-subtle)]">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-[var(--brand-border)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] shadow-[4px_0_24px_-12px_rgba(15,23,42,0.15)] transition-colors duration-300 md:flex">
        <SidebarContent
          brand={brand}
          wordmarkSrc={wordmarkSrc}
          nav={safeNav}
          userEmail={userEmail}
          onLogout={onLogout}
          currentPath={currentPath}
          labels={labels}
          groupLabel={groupLabel}
          footerActions={sidebarFooter}
        />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label={labels.closeMenu}
          className="fixed inset-0 z-40 bg-[var(--brand-primary)]/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--brand-border)] bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            type="button"
            aria-label={labels.closeNavigation}
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <IconX size={20} />
          </button>
        </div>
        <SidebarContent
          brand={brand}
          wordmarkSrc={wordmarkSrc}
          nav={safeNav}
          userEmail={userEmail}
          onLogout={onLogout}
          currentPath={currentPath}
          onNavigate={() => setMobileOpen(false)}
          labels={labels}
          groupLabel={groupLabel}
          footerActions={sidebarFooter}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/90 px-4 py-3 backdrop-blur-md md:hidden">
          <button
            type="button"
            aria-label={labels.openNavigation}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-lg p-2 text-[var(--brand-text-primary)] transition hover:bg-[var(--brand-surface-elevated)]"
          >
            <IconMenu size={20} />
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--brand-text-primary)]">{brand}</span>
          {headerActions}
        </header>

        <main className="flex-1 page-enter">{children}</main>
      </div>
    </div>
  );
}
