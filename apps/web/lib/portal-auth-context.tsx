"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createPortalClient,
  formatErrorForUser,
  isAppError,
  type PortalClient,
  type PortalCustomer,
} from "@fieldforge/sdk";
import { API_URL } from "@/lib/api-url";

const STORAGE_KEY = "ff_portal_token";

function toPortalError(err: unknown): Error {
  if (isAppError(err)) {
    return err;
  }
  return new Error(formatErrorForUser(err));
}

interface PortalAuthState {
  token: string | null;
  customer: PortalCustomer | null;
  client: PortalClient;
  requestMagicLink: (email: string, tenantSlug: string) => Promise<{ devLoginUrl?: string }>;
  verifyToken: (token: string) => Promise<void>;
  setCustomer: (customer: PortalCustomer) => void;
  logout: () => void;
}

const PortalAuthContext = createContext<PortalAuthState | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);

  const client = useMemo(() => {
    const c = createPortalClient(API_URL);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) c.setToken(stored);
    }
    return c;
  }, []);

  useLayoutEffect(() => {
    client.setToken(token ?? "");
  }, [client, token]);

  useEffect(() => {
    if (!token) {
      setCustomer(null);
      return;
    }
    client
      .me()
      .then(setCustomer)
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setCustomer(null);
      });
  }, [client, token]);

  const value: PortalAuthState = {
    token,
    customer,
    client,
    setCustomer,
    async requestMagicLink(email, tenantSlug) {
      try {
        const res = await client.requestMagicLink({ email, tenant_slug: tenantSlug });
        return { devLoginUrl: res.dev_login_url };
      } catch (err) {
        throw toPortalError(err);
      }
    },
    async verifyToken(magicToken) {
      try {
        const res = await client.verifyMagicLink(magicToken);
        client.setToken(res.token);
        localStorage.setItem(STORAGE_KEY, res.token);
        setToken(res.token);
        setCustomer(res.customer);
      } catch (err) {
        throw toPortalError(err);
      }
    },
    logout() {
      localStorage.removeItem(STORAGE_KEY);
      client.setToken("");
      setToken(null);
      setCustomer(null);
    },
  };

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth requires PortalAuthProvider");
  return ctx;
}
