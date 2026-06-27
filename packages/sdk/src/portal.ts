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
  checkout_url?: string;
  amount_cents: number;
  invoice_id: string;
  mock?: boolean;
}

export interface PortalBooking {
  id: string;
  title: string;
  status: string;
  scheduled_at?: string;
  notes?: string;
}

export interface PortalScheduleSlot {
  starts_at: string;
  ends_at: string;
}

export interface PortalHistoryItem {
  id: string;
  title: string;
  status: string;
  scheduled_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface PortalQuote {
  id: string;
  title: string;
  status: string;
  subtotal_cents: number;
  total_cents: number;
  created_at: string;
}

export interface PortalQuoteLine {
  description: string;
  quantity: number;
  unit_price_cents: number;
}

export interface PortalQuoteDetail extends PortalQuote {
  lines: PortalQuoteLine[];
}

export interface PortalMessageThread {
  id: string;
  subject: string;
  preview: string;
  status: string;
  created_at: string;
  updated_at: string;
}







export interface PortalSupportRequest {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
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

  listBookings() {
    return this.request<{ data: PortalBooking[] }>("GET", "/portal/bookings");
  }

  listScheduleSlots(params?: { from?: string; to?: string }) {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return this.request<{ data: PortalScheduleSlot[] }>("GET", `/portal/schedule/slots${suffix}`);
  }

  createScheduleBooking(data: { title?: string; scheduled_at: string; notes?: string }) {
    return this.request<PortalBooking>("POST", "/portal/schedule", data);
  }

  listHistory() {
    return this.request<{ data: PortalHistoryItem[] }>("GET", "/portal/history");
  }

  listQuotes() {
    return this.request<{ data: PortalQuote[] }>("GET", "/portal/quotes");
  }

  getQuote(id: string) {
    return this.request<PortalQuoteDetail>("GET", `/portal/quotes/${id}`);
  }

  acceptQuote(id: string) {
    return this.request<{ status: string; estimate_id: string }>("POST", `/portal/quotes/${id}/accept`, {});
  }

  listMessages() {
    return this.request<{ data: PortalMessageThread[] }>("GET", "/portal/messages");
  }

  createSupportRequest(data: { subject: string; message: string }) {
    return this.request<PortalSupportRequest>("POST", "/portal/support", data);
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

  /** @deprecated Use listBookings */
  listPortalBookings() {
    return this.listBookings();
  }

  /** @deprecated Use listMessages */
  listPortalMessages() {
    return this.listMessages();
  }

  /** @deprecated Use createSupportRequest */
  createPortalSupportRequest(data: { subject: string; message: string }) {
    return this.createSupportRequest(data);
  }
}

export function createPortalClient(baseUrl: string) {
  return new PortalClient(baseUrl);
}
