"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createPlatformAdminClient, type PlatformAdmin } from "@fieldforge/sdk";
import { API_URL } from "@/lib/api-url";

const TOKEN_KEY = "ff_platform_token";
const ADMIN_KEY = "ff_platform_admin";

interface AdminAuthContextValue {
  client: ReturnType<typeof createPlatformAdminClient>;
  admin: PlatformAdmin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function readStoredAdmin(): PlatformAdmin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as PlatformAdmin) : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const client = useMemo(() => createPlatformAdminClient(API_URL, token ?? undefined), [token]);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const storedAdmin = readStoredAdmin();
    if (stored) {
      setToken(stored);
      setAdmin(storedAdmin);
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await createPlatformAdminClient(API_URL).login(email, password);
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(res.admin));
      setToken(res.token);
      setAdmin(res.admin);
      router.push("/admin/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setToken(null);
    setAdmin(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ client, admin, loading, login, logout }),
    [client, admin, loading, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
