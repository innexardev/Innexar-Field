import { parseApiError, parseFetchError } from "./errors";

export interface PortalCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tenant_id: string;
  company_name?: string;
}

export interface PortalInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total_cents: number;
  due_at?: string;
  paid_at?: string;
  created_at?: string;
}

export interface PortalDocument {
  id: string;
  kind: "estimate" | "contract";
  title: string;
  status: string;
  amount_cents: number;
  view_url: string;
  pdf_url?: string;
  created_at?: string;
}

export interface PortalPayment {
  id: string;
  invoice_id?: string;
  invoice_number?: string;
  amount_cents: number;
  status: "received" | "pending" | "failed";
  method?: string;
  paid_at?: string;
  created_at?: string;
}

export interface PortalPaymentIntent {
  payment_intent_id: string;
  client_secret: string;
  amount_cents: number;
  invoice_id: string;
  mock?: boolean;
}

export interface PortalAuthResponse {
  token: string;
  customer: PortalCustomer;
}

export interface PortalMagicLinkResponse {
  message: string;
  dev_login_url?: string;
  dev_token?: string;
}

export class PortalClient {
  constructor(
    private baseUrl: string,
    private token?: string,
  ) {}

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw parseFetchError(err);
    }

    if (!res.ok) {
      const raw = await res.json().catch(() => null);
      throw parseApiError(res, raw);
    }
    return res.json() as Promise<T>;
  }

  requestMagicLink(data: { email: string; tenant_slug: string }) {
    return this.request<PortalMagicLinkResponse>("POST", "/public/portal/login", data);
  }

  verifyMagicLink(token: string) {
    return this.request<PortalAuthResponse>("POST", "/public/portal/verify", { token });
  }

  me() {
    return this.request<PortalCustomer>("GET", "/portal/me");
  }

  updateProfile(data: Partial<Pick<PortalCustomer, "name" | "email" | "phone">>) {
    return this.request<PortalCustomer>("PATCH", "/portal/me", data);
  }

  listInvoices() {
    return this.request<{ data: PortalInvoice[] }>("GET", "/portal/invoices");
  }

  getInvoice(id: string) {
    return this.request<PortalInvoice>("GET", `/portal/invoices/${id}`);
  }

  listPayments() {
    return this.request<{ data: PortalPayment[] }>("GET", "/portal/payments");
  }

  createPaymentIntent(invoiceId: string) {
    return this.request<PortalPaymentIntent>("POST", `/portal/invoices/${invoiceId}/payment-intent`, {});
  }

  confirmPayment(invoiceId: string) {
    return this.request<{ status: string; invoice_id: string }>(
      "POST",
      `/portal/invoices/${invoiceId}/confirm-payment`,
      {},
    );
  }

  listDocuments() {
    return this.request<{ data: PortalDocument[] }>("GET", "/portal/documents");
  }

  /** @deprecated Use requestMagicLink */
  requestPortalMagicLink(data: { email: string; tenant_slug: string }) {
    return this.requestMagicLink(data);
  }

  /** @deprecated Use verifyMagicLink */
  verifyPortalMagicLink(token: string) {
    return this.verifyMagicLink(token);
  }

  /** @deprecated Use me */
  portalMe() {
    return this.me();
  }

  /** @deprecated Use updateProfile */
  updatePortalProfile(data: Partial<Pick<PortalCustomer, "name" | "email" | "phone">>) {
    return this.updateProfile(data);
  }

  /** @deprecated Use listInvoices */
  listPortalInvoices() {
    return this.listInvoices();
  }

  /** @deprecated Use getInvoice */
  getPortalInvoice(id: string) {
    return this.getInvoice(id);
  }

  /** @deprecated Use listPayments */
  listPortalPayments() {
    return this.listPayments();
  }

  /** @deprecated Use createPaymentIntent */
  createPortalPaymentIntent(invoiceId: string) {
    return this.createPaymentIntent(invoiceId);
  }

  /** @deprecated Use confirmPayment */
  confirmPortalPayment(invoiceId: string) {
    return this.confirmPayment(invoiceId);
  }

  /** @deprecated Use listDocuments */
  listPortalDocuments() {
    return this.listDocuments();
  }
}

export function createPortalClient(baseUrl: string) {
  return new PortalClient(baseUrl);
}
