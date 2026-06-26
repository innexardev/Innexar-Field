"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import {
  FieldForgeClient,
  formatErrorForUser,
  isAppError,
  type User,
  type NavItem,
} from "@fieldforge/sdk";
import { API_URL } from "@/lib/api-url";
import { applyOnboardingStatus, saveSignupSeed } from "@/lib/onboarding/storage";

function toAuthError(err: unknown): Error {
  if (isAppError(err)) {
    return err;
  }
  return new Error(formatErrorForUser(err));
}

function normalizeNav(items: NavItem[] | null | undefined): NavItem[] {
  return items ?? [];
}

interface AuthState {
  token: string | null;
  user: User | null;
  nav: NavItem[];
  client: FieldForgeClient;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    company_name: string;
    email: string;
    password: string;
    industry_pack: string;
    plan_id?: string;
    metadata?: import("@fieldforge/sdk").SignupMetadata;
  }) => Promise<void>;
  logout: () => void;
  refreshNav: () => Promise<void>;
  applyNav: (items: NavItem[]) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("ff_token") : null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [nav, setNav] = useState<NavItem[]>([]);

  const client = useMemo(() => {
    const c = new FieldForgeClient(API_URL);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ff_token");
      if (stored) c.setToken(stored);
    }
    return c;
  }, []);

  useLayoutEffect(() => {
    client.setToken(token ?? "");
  }, [client, token]);

  useEffect(() => {
    if (!token) return;
    client.me().then(setUser).catch(() => {
      localStorage.removeItem("ff_token");
      setToken(null);
    });
    client.getNav().then((r) => setNav(normalizeNav(r.data))).catch(() => {});
  }, [client, token]);

  const value: AuthState = {
    token,
    user,
    nav,
    client,
    async login(email, password) {
      try {
        const res = await client.login(email, password);
        client.setToken(res.token);
        localStorage.setItem("ff_token", res.token);
        setToken(res.token);
        setUser(res.user);
        const n = await client.getNav();
        setNav(normalizeNav(n.data));
      } catch (err) {
        throw toAuthError(err);
      }
    },
    async signup(data) {
      let res;
      try {
        res = await client.signup(data);
      } catch (err) {
        throw toAuthError(err);
      }
      client.setToken(res.token);
      localStorage.setItem("ff_token", res.token);
      saveSignupSeed({
        company_name: data.company_name,
        industry_pack: data.industry_pack,
        plan_id: data.plan_id,
      });
      setToken(res.token);
      setUser({ id: res.user_id!, email: data.email, role: "owner", tenant_id: res.tenant_id! });
      if (res.onboarding) {
        applyOnboardingStatus(res.onboarding);
      }
      const n = await client.getNav();
      setNav(normalizeNav(n.data));
    },
    logout() {
      localStorage.removeItem("ff_token");
      client.setToken("");
      setToken(null);
      setUser(null);
      setNav([]);
    },
    async refreshNav() {
      const n = await client.getNav();
      setNav(normalizeNav(n.data));
    },
    applyNav(items) {
      setNav(normalizeNav(items));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
