export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export {
  AppError,
  formatErrorForUser,
  isAppError,
  isRetryable,
  parseApiError,
  parseFetchError,
  type AppErrorCode,
  type ApiErrorBody,
} from "./errors";

export {
  PlatformAdminClient,
  createPlatformAdminClient,
  type LandingContentBlock,
  type LandingContentInput,
  type PlatformAdmin,
  type PlatformAuditEntry,
  type PlatformAuthResponse,
  type PlatformPlan,
  type PlatformPlanInput,
  type PlatformPromotion,
  type PlatformPromotionInput,
  type PlatformConfig,
  type PlatformConfigInput,
  type PlatformStats,
  type PlatformTenant,
  type PlatformTenantPatch,
  type PublicPlan,
} from "./platform-admin";

import { parseApiError, parseFetchError } from "./errors";
import type { PublicPlan } from "./platform-admin";

/** JSON keys that must be arrays; Go nil slices encode as null. */
const ARRAY_FIELDS = new Set([
  "data",
  "columns",
  "by_date",
  "work_orders",
  "leads",
  "items",
  "stops",
  "rooms",
  "skills",
  "lines",
  "checklist",
  "assignments",
  "revenue_trend",
  "top_jobs_by_margin",
  "buckets",
  "completed_steps",
  "industry_packs",
  "modules",
  "blocks",
]);

/** Coerce null list fields to [] so module pages never crash on .map / .length / spread. */
export function normalizeListPayload<T>(value: T): T {
  return normalizeArrays(value) as T;
}

function normalizeArrays(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map(normalizeArrays);
  }
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rec)) {
      if (val === null && ARRAY_FIELDS.has(key)) {
        out[key] = [];
      } else {
        out[key] = normalizeArrays(val);
      }
    }
    return out;
  }
  return value;
}

export const DEFAULT_API_URL = "http://localhost:8081/api/v1";

export interface AuthResponse {
  token: string;
  user?: User;
  tenant_id?: string;
  user_id?: string;
  onboarding?: OnboardingStatus;
}

export interface SignupMetadata {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface OnboardingStatus {
  step: string;
  completed_steps: string[];
  industry_packs?: string[];
  profile?: OnboardingProfile;
  modules?: string[];
  setup_skipped?: boolean;
  completed: boolean;
}

export interface OnboardingProfile {
  state?: string;
  team_size?: string;
  logo_url?: string;
}

export interface OnboardingModulePreview {
  id: string;
  name: string;
  required: boolean;
  enabled: boolean;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
}

export interface WorkspaceUser {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: LeadStatus;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export interface LeadBoardColumn {
  status: LeadStatus;
  leads: Lead[];
  count: number;
}

export interface LeadsBoardResponse {
  data: Lead[];
  columns: LeadBoardColumn[];
  summary: Record<string, number>;
}

export interface Property {
  id: string;
  customer_id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  is_primary: boolean;
}

export interface Estimate {
  id: string;
  customer_id?: string;
  title: string;
  status: string;
  subtotal_cents: number;
  total_cents: number;
  public_token?: string;
  created_at?: string;
}

export interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
}

export interface EstimateDetail extends Estimate {
  lines: EstimateLineItem[];
}

export interface PublicQuote {
  title: string;
  status: string;
  subtotal_cents: number;
  total_cents: number;
  company_name: string;
  customer_name?: string;
  lines: EstimateLineItem[];
  created_at: string;
}

export interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  industry_packs: string[];
  enabled: boolean;
}

export interface PriceBookTier {
  beds: number;
  baths: number;
  price_cents: number;
}

export interface PriceBookItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price_cents: number;
  pricing_model: "flat" | "room_based";
  pricing_tiers: PriceBookTier[];
}

export interface PriceBookImportResult {
  status: string;
  message: string;
  accepted_rows: number;
  skipped_rows: number;
}

export interface EstimateCalculateResult {
  subtotal_cents: number;
  markup_cents: number;
  tax_cents: number;
  total_cents: number;
  markup_percent: number;
  tax_percent: number;
}

export interface TakeoffRoom {
  name: string;
  sqft: number;
}

export interface TakeoffMeasurement {
  id: string;
  label: string;
  total_sqft: number;
  rooms: TakeoffRoom[];
  created_at?: string;
}

export interface Job {
  id: string;
  customer_id?: string;
  estimate_id?: string;
  title: string;
  status: string;
  scheduled_at?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_cents: number;
  customer_id?: string;
  job_id?: string;
  due_at?: string;
  paid_at?: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  invoice_id?: string;
  invoice_number?: string;
  amount_cents: number;
  status: "received" | "pending" | "failed";
  method?: string;
  paid_at?: string;
  created_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  category: string;
  read: boolean;
  created_at: string;
}

export interface Crew {
  id: string;
  name: string;
  lead_name?: string;
  member_count: number;
  skills: string[];
  status: string;
  created_at?: string;
}

export interface RecurringJob {
  id: string;
  customer_id?: string;
  crew_id?: string;
  job_id?: string;
  title: string;
  frequency: string;
  next_occurrence?: string;
  active: boolean;
  notes?: string;
  created_at?: string;
}

export interface RouteStop {
  job_id: string;
  title: string;
  order: number;
  scheduled_at?: string;
}

export interface Route {
  id: string;
  crew_id?: string;
  crew_name?: string;
  date: string;
  stops: RouteStop[];
  stop_count: number;
  estimated_minutes: number;
}

export interface ScheduleMapPin {
  id: string;
  type: "job" | "crew";
  title: string;
  lat: number;
  lng: number;
  status?: string;
}

export interface ScheduleMapResponse {
  from: string;
  to: string;
  data: ScheduleMapPin[];
}

export interface RoutesResponse {
  data: Route[];
  date: string;
  optimized: boolean;
}

export interface Contract {
  id: string;
  customer_id?: string;
  customer_name?: string;
  title: string;
  status: string;
  amount_cents: number;
  starts_at?: string;
  ends_at?: string;
  terms?: string;
}

export interface ContractTemplate {
  id: string;
  slug: string;
  name_key: string;
  category: string;
  body: string;
}

export type ReportDataSource = "live" | "stub";

export interface ReportKpi {
  id: string;
  label: string;
  value: string;
  delta?: string;
  category: string;
}

export interface DashboardKpi {
  value: string;
  delta?: string;
  note?: string;
}

export interface OwnerDashboard {
  revenue_mtd: DashboardKpi;
  gross_margin: DashboardKpi;
  active_jobs: DashboardKpi;
  revenue_trend: number[];
  top_jobs_by_margin: { name: string; margin_percent: number }[];
}

export interface DispatcherBoardColumn {
  status: string;
  count: number;
}

export interface DispatcherDashboard {
  jobs_today: DashboardKpi;
  overdue: DashboardKpi;
  crew_available: DashboardKpi;
  crews_on_route: DashboardKpi;
  board: DispatcherBoardColumn[];
}

export interface ARAgingBucket {
  bucket: string;
  amount: string;
  count: number;
}

export interface PendingExpenseItem {
  id: string;
  description: string;
  amount: string;
  category: string;
  submitted_at: string;
}

export interface AccountantDashboard {
  ar_aging: {
    total: string;
    over_30: string;
    overdue_count: number;
    buckets: ARAgingBucket[];
  };
  pending_expenses: {
    count: number;
    total: string;
    items: PendingExpenseItem[];
  };
}

export interface ReportSummary {
  id: string;
  title: string;
  description: string;
  value: string;
  delta?: string;
  period: string;
  href: string;
}

export interface WorkOrder {
  id: string;
  job_id?: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  sla_due_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  job_id?: string;
  description: string;
  amount_cents: number;
  category: string;
  status: string;
  expense_date: string;
}

export interface JobCostLine {
  id: string;
  job_id: string;
  cost_code: string;
  description: string;
  budget_cents: number;
  actual_cents: number;
  variance_cents: number;
}

export interface ChartOfAccount {
  id: string;
  account_number: string;
  name: string;
  account_type: string;
  balance_cents: number;
  is_active: boolean;
}

export interface APBill {
  id: string;
  vendor_name: string;
  bill_number: string;
  amount_cents: number;
  due_date?: string;
  status: string;
}

export interface ARAging {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount_cents: number;
  days_outstanding: number;
  aging_bucket: string;
}

export interface PurchaseOrder {
  id: string;
  vendor_name: string;
  po_number: string;
  amount_cents: number;
  status: string;
  job_id?: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employment_type: string;
  hourly_rate_cents: number;
  status: string;
}

export interface Timesheet {
  id: string;
  employee_id: string;
  job_id?: string;
  work_date: string;
  hours: number;
  status: string;
}

export interface PayrollRun {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
  status: string;
  total_gross_cents: number;
  employee_count: number;
}

export interface TaxProfile {
  id: string;
  employee_id: string;
  filing_status: string;
  allowances: number;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  budget_cents: number;
  customer_id?: string;
  version?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at?: string;
}

export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;
  weather?: string;
  crew_count: number;
  notes?: string;
  photo_count?: number;
  created_at?: string;
}

export interface DailyLogPhoto {
  id: string;
  daily_log_id: string;
  caption?: string;
  url: string;
  created_at?: string;
}

export interface PermitAlert {
  id: string;
  permit_number?: string;
  permit_type: string;
  jurisdiction?: string;
  status: string;
  expires_date: string;
  severity: "expired" | "expires_today" | "expiring_soon" | "expiring";
  days_until: number;
  message: string;
}

export interface Subcontractor {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  trade?: string;
  status: string;
  created_at?: string;
}

export interface ChangeOrder {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  amount_cents: number;
  status: string;
  rejection_reason?: string;
  approved_at?: string;
  created_at?: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  percent_complete: number;
  amount_cents: number;
  status: string;
  due_date?: string;
  completed_at?: string;
  created_at?: string;
}

export interface Permit {
  id: string;
  project_id: string;
  permit_number?: string;
  permit_type: string;
  jurisdiction?: string;
  status: string;
  issued_date?: string;
  expires_date?: string;
  notes?: string;
  created_at?: string;
}

export interface LienWaiver {
  id: string;
  project_id: string;
  party_name: string;
  waiver_type: string;
  amount_cents: number;
  status: string;
  signed_at?: string;
  notes?: string;
  created_at?: string;
}

export interface RFI {
  id: string;
  project_id: string;
  subject: string;
  question?: string;
  response?: string;
  status: string;
  due_date?: string;
  created_at?: string;
}

export interface CleanPhase {
  id: string;
  job_id: string;
  phase: string;
  status: string;
  completed_at?: string;
  notes?: string;
  created_at?: string;
}

export interface RecurringClean {
  id: string;
  customer_id?: string;
  title?: string;
  frequency: string;
  phase: string;
  next_occurrence?: string;
  active: boolean;
  notes?: string;
  created_at?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface CleanJob {
  id: string;
  customer_id?: string;
  title: string;
  status: string;
  scheduled_at?: string;
  phase?: string;
  checklist_done: number;
  checklist_total: number;
}

export interface CleanJobDetail {
  id: string;
  customer_id?: string;
  title: string;
  status: string;
  scheduled_at?: string;
  notes?: string;
  phase: string;
  checklist: ChecklistItem[];
}

export interface QcPhoto {
  id: string;
  job_id: string;
  kind: "before" | "after";
  caption?: string;
  url: string;
  created_at?: string;
}

export interface QcReviewItem {
  id: string;
  job_id: string;
  job_title: string;
  phase: string;
  status: string;
  photo_count: number;
  score?: number;
}

export interface CleaningSupply {
  id: string;
  name: string;
  unit: string;
  on_hand: number;
  reorder_threshold: number;
  needs_reorder: boolean;
  created_at?: string;
}

export interface TodayCleansResponse {
  data: CleanJob[];
  date: string;
}

export interface ScheduleDay {
  date: string;
  jobs: Job[];
}

export interface ScheduleResponse {
  from: string;
  to: string;
  data: Job[];
  by_date: ScheduleDay[];
}

export interface WorkOrderAssignment {
  id: string;
  work_order_id: string;
  technician_id: string;
  status: string;
  assigned_at: string;
}

export interface BoardWorkOrder {
  work_order: WorkOrder;
  assignments: WorkOrderAssignment[];
}

export interface BoardColumn {
  status: string;
  work_orders: BoardWorkOrder[];
  count: number;
}

export interface DispatchBoardResponse {
  data: BoardWorkOrder[];
  columns: BoardColumn[];
  summary: Record<string, number>;
}

export interface CheckoutSession {
  session_id: string;
  checkout_url: string;
  mock?: boolean;
}

export interface IntegrationCatalogItem {
  id: string;
  name: string;
  enabled: boolean;
  category: string;
  description: string;
  plans?: string[];
}

export interface IntegrationStatus {
  integration_id: string;
  status: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
  connected_at?: string;
  updated_at: string;
}

export interface AvalaraTaxCalculation {
  amount_cents: number;
  tax_cents: number;
  total_cents: number;
  rate_percent: number;
  jurisdiction: string;
  mock?: boolean;
  tax_pending?: boolean;
  provider: string;
  integration_id: string;
}

export interface StripeConnectOnboarding {
  onboarding_url: string;
  account_id: string;
  mock?: boolean;
}

export interface StripeConnectStatusResult {
  integration_id: string;
  status: string;
  account_id?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  mock?: boolean;
}

export interface QuickBooksOAuthStartResult {
  authorize_url: string;
  state: string;
  mock?: boolean;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  plugin_id: string;
}

export interface IndustryPack {
  id: string;
  name: string;
  description: string;
  modules: string[];
}

export class FieldForgeClient {
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
    const payload = (await res.json()) as T;
    return normalizeListPayload(payload);
  }

  getPublicConfig() {
    return this.request<Record<string, unknown>>("GET", "/config/public");
  }

  listPublicPlans() {
    return this.request<{ data: PublicPlan[] }>("GET", "/public/plans");
  }

  getIndustryPacks() {
    return this.request<{ data: IndustryPack[] }>("GET", "/industry-packs");
  }

  getOnboardingStatus() {
    return this.request<OnboardingStatus>("GET", "/onboarding/status");
  }

  saveOnboardingIndustry(industryPacks: string[]) {
    return this.request<OnboardingStatus>("POST", "/onboarding/industry", {
      industry_packs: industryPacks,
    });
  }

  saveOnboardingProfile(profile: OnboardingProfile) {
    return this.request<OnboardingStatus>("POST", "/onboarding/profile", profile);
  }

  uploadTenantLogo(file: File) {
    const form = new FormData();
    form.append("logo", file);
    return this.uploadRequest<{ logo_url: string }>("POST", "/tenant/logo/upload", form);
  }

  private async uploadRequest<T>(method: string, path: string, body: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body,
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

  previewOnboardingModules() {
    return this.request<{ data: OnboardingModulePreview[] }>("GET", "/onboarding/modules/preview");
  }

  updateOnboardingModules(modules: string[]) {
    return this.request<OnboardingStatus>("PATCH", "/onboarding/modules", { modules });
  }

  completeOnboarding() {
    return this.request<{ onboarding: OnboardingStatus; nav: { data: NavItem[] } }>(
      "POST",
      "/onboarding/complete",
      {},
    );
  }

  skipOnboardingSetup() {
    return this.request<OnboardingStatus>("POST", "/onboarding/skip-setup", {});
  }

  signup(data: {
    company_name: string;
    email: string;
    password: string;
    industry_pack: string;
    plan_id?: string;
    metadata?: SignupMetadata;
  }) {
    return this.request<AuthResponse>("POST", "/auth/signup", data);
  }

  login(email: string, password: string) {
    return this.request<{ token: string; user: User }>("POST", "/auth/login", {
      email,
      password,
    });
  }

  me() {
    return this.request<User>("GET", "/auth/me");
  }

  listUsers() {
    return this.request<{ data: WorkspaceUser[] }>("GET", "/users");
  }

  getNav() {
    return this.request<{ data: NavItem[] }>("GET", "/nav");
  }

  listCustomers() {
    return this.request<{ data: Customer[] }>("GET", "/crm/customers");
  }

  getCustomer(id: string) {
    return this.request<Customer>("GET", `/crm/customers/${id}`);
  }

  createCustomer(data: Partial<Customer>) {
    return this.request<Customer>("POST", "/crm/customers", data);
  }

  updateCustomer(id: string, data: Partial<Pick<Customer, "name" | "email" | "phone" | "notes">>) {
    return this.request<Customer>("PATCH", `/crm/customers/${id}`, data);
  }

  listCustomerProperties(customerId: string) {
    return this.request<{ data: Property[] }>("GET", `/crm/customers/${customerId}/properties`);
  }

  createCustomerProperty(
    customerId: string,
    data: {
      label: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      is_primary?: boolean;
    },
  ) {
    return this.request<Property>("POST", `/crm/customers/${customerId}/properties`, data);
  }

  listLeads() {
    return this.request<{ data: Lead[] }>("GET", "/crm/leads");
  }

  getLeadsBoard() {
    return this.request<LeadsBoardResponse>("GET", "/crm/leads/board");
  }

  getLead(id: string) {
    return this.request<Lead>("GET", `/crm/leads/${id}`);
  }

  createLead(data: { name: string; email?: string; phone?: string; source?: string }) {
    return this.request<Lead>("POST", "/crm/leads", data);
  }

  updateLead(
    id: string,
    data: Partial<Pick<Lead, "name" | "email" | "phone" | "source" | "status">>,
  ) {
    return this.request<Lead>("PATCH", `/crm/leads/${id}`, data);
  }

  listEstimates() {
    return this.request<{ data: Estimate[] }>("GET", "/estimating/estimates");
  }

  getEstimate(id: string) {
    return this.request<EstimateDetail>("GET", `/estimating/estimates/${id}`);
  }

  createEstimate(data: {
    title: string;
    customer_id?: string;
    lines?: { description: string; quantity: number; unit_price_cents: number }[];
  }) {
    return this.request<Estimate>("POST", "/estimating/estimates", data);
  }

  updateEstimate(
    id: string,
    data: {
      title?: string;
      customer_id?: string;
      lines?: { description: string; quantity: number; unit_price_cents: number }[];
    },
  ) {
    return this.request<EstimateDetail>("PATCH", `/estimating/estimates/${id}`, data);
  }

  calculateEstimate(id: string, data?: { markup_percent?: number; tax_percent?: number }) {
    return this.request<EstimateCalculateResult>(
      "POST",
      `/estimating/estimates/${id}/calculate`,
      data ?? {},
    );
  }

  sendEstimate(id: string) {
    return this.request<EstimateDetail>("POST", `/estimating/estimates/${id}/send`, {});
  }

  acceptEstimate(id: string) {
    return this.request<{ status: string; estimate_id: string }>(
      "POST",
      `/estimating/estimates/${id}/accept`,
      {},
    );
  }

  getPublicQuote(token: string) {
    return this.request<PublicQuote>("GET", `/public/quotes/${token}`);
  }

  acceptPublicQuote(token: string) {
    return this.request<{ status: string }>("POST", `/public/quotes/${token}/accept`, {});
  }

  listMarketplacePlugins() {
    return this.request<{ data: MarketplacePlugin[] }>("GET", "/marketplace/plugins");
  }

  listPriceBookItems() {
    return this.request<{ data: PriceBookItem[] }>("GET", "/estimating/price-book");
  }

  createPriceBookItem(data: {
    name: string;
    category?: string;
    unit?: string;
    unit_price_cents: number;
    pricing_model?: "flat" | "room_based";
    pricing_tiers?: PriceBookTier[];
  }) {
    return this.request<PriceBookItem>("POST", "/estimating/price-book", data);
  }

  getPriceBookItem(id: string) {
    return this.request<PriceBookItem>("GET", `/estimating/price-book/${id}`);
  }

  updatePriceBookItem(
    id: string,
    data: Partial<
      Pick<PriceBookItem, "name" | "category" | "unit" | "unit_price_cents" | "pricing_model" | "pricing_tiers">
    >,
  ) {
    return this.request<PriceBookItem>("PATCH", `/estimating/price-book/${id}`, data);
  }

  deletePriceBookItem(id: string) {
    return this.request<void>("DELETE", `/estimating/price-book/${id}`);
  }

  importPriceBookCSV(csvContent: string) {
    return this.request<PriceBookImportResult>("POST", "/estimating/price-book/import", {
      csv_content: csvContent,
    });
  }

  listTakeoffMeasurements() {
    return this.request<{ data: TakeoffMeasurement[] }>("GET", "/estimating/takeoff");
  }

  createTakeoffMeasurement(data: { label: string; rooms: TakeoffRoom[] }) {
    return this.request<TakeoffMeasurement>("POST", "/estimating/takeoff", data);
  }

  getTakeoffMeasurement(id: string) {
    return this.request<TakeoffMeasurement>("GET", `/estimating/takeoff/${id}`);
  }

  listJobs() {
    return this.request<{ data: Job[] }>("GET", "/scheduling/jobs");
  }

  getJob(id: string) {
    return this.request<Job>("GET", `/scheduling/jobs/${id}`);
  }

  updateJob(id: string, data: Partial<Pick<Job, "title" | "status" | "notes">>) {
    return this.request<Job>("PATCH", `/scheduling/jobs/${id}`, data);
  }

  completeJob(id: string) {
    return this.request<{ status: string; job_id: string }>("POST", `/scheduling/jobs/${id}/complete`, {});
  }

  listSchedule(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString();
    return this.request<ScheduleResponse>("GET", `/scheduling/schedule${q ? `?${q}` : ""}`);
  }

  createJob(data: Partial<Job>) {
    return this.request<Job>("POST", "/scheduling/jobs", data);
  }

  listInvoices() {
    return this.request<{ data: Invoice[] }>("GET", "/invoicing/invoices");
  }

  getInvoice(id: string) {
    return this.request<Invoice>("GET", `/invoicing/invoices/${id}`);
  }

  createInvoice(data: { customer_id?: string; job_id?: string; total_cents: number }) {
    return this.request<Invoice>("POST", "/invoicing/invoices", data);
  }

  sendInvoice(id: string) {
    return this.request<Invoice>("POST", `/invoicing/invoices/${id}/send`, {});
  }

  payInvoice(id: string) {
    return this.request<{ status: string; invoice_id: string }>("POST", `/invoicing/invoices/${id}/pay`, {});
  }

  listPayments() {
    return this.request<{ data: Payment[] }>("GET", "/invoicing/payments");
  }

  listNotifications() {
    return this.request<{ data: Notification[] }>("GET", "/notifications");
  }

  listCrews() {
    return this.request<{ data: Crew[] }>("GET", "/scheduling/crews");
  }

  getCrew(id: string) {
    return this.request<Crew>("GET", `/scheduling/crews/${id}`);
  }

  createCrew(data: {
    name: string;
    lead_name?: string;
    member_count?: number;
    skills?: string[];
    status?: string;
  }) {
    return this.request<Crew>("POST", "/scheduling/crews", data);
  }

  updateCrew(
    id: string,
    data: Partial<Pick<Crew, "name" | "lead_name" | "member_count" | "skills" | "status">>,
  ) {
    return this.request<Crew>("PATCH", `/scheduling/crews/${id}`, data);
  }

  deleteCrew(id: string) {
    return this.request<void>("DELETE", `/scheduling/crews/${id}`);
  }

  listRoutes(date?: string) {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.request<RoutesResponse>("GET", `/scheduling/routes${q}`);
  }

  getScheduleMap(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString();
    return this.request<ScheduleMapResponse>("GET", `/scheduling/map${q ? `?${q}` : ""}`);
  }

  listRecurringJobs() {
    return this.request<{ data: RecurringJob[] }>("GET", "/scheduling/recurring-jobs");
  }

  getRecurringJob(id: string) {
    return this.request<RecurringJob>("GET", `/scheduling/recurring-jobs/${id}`);
  }

  createRecurringJob(data: {
    title?: string;
    customer_id?: string;
    crew_id?: string;
    job_id?: string;
    frequency?: string;
    next_occurrence?: string;
    notes?: string;
  }) {
    return this.request<RecurringJob>("POST", "/scheduling/recurring-jobs", data);
  }

  updateRecurringJob(
    id: string,
    data: Partial<{
      title: string;
      frequency: string;
      active: boolean;
      notes: string;
      crew_id: string;
      job_id: string;
      next_occurrence: string;
    }>,
  ) {
    return this.request<RecurringJob>("PATCH", `/scheduling/recurring-jobs/${id}`, data);
  }

  listContracts() {
    return this.request<{ data: Contract[] }>("GET", "/crm/contracts");
  }

  listContractTemplates() {
    return this.request<{ data: ContractTemplate[] }>("GET", "/crm/contracts/templates");
  }

  createContract(data: {
    title: string;
    customer_id?: string;
    status?: string;
    amount_cents?: number;
    starts_at?: string;
    ends_at?: string;
    terms?: string;
  }) {
    return this.request<Contract>("POST", "/crm/contracts", data);
  }

  listReportKpis() {
    return this.request<{ data: ReportKpi[]; source: ReportDataSource }>("GET", "/reports/kpis");
  }

  getOwnerDashboard() {
    return this.request<{ data: OwnerDashboard; source: ReportDataSource }>("GET", "/reports/owner");
  }

  getDispatcherDashboard() {
    return this.request<{ data: DispatcherDashboard; source: ReportDataSource }>("GET", "/reports/dispatcher");
  }

  getAccountantDashboard() {
    return this.request<{ data: AccountantDashboard; source: ReportDataSource }>("GET", "/reports/accountant");
  }

  getProfitAndLossReport() {
    return this.request<{ data: ReportSummary; source: ReportDataSource }>("GET", "/reports/pl");
  }

  getCashFlowReport() {
    return this.request<{ data: ReportSummary; source: ReportDataSource }>("GET", "/reports/cash-flow");
  }

  getWIPReport() {
    return this.request<{ data: ReportSummary; source: ReportDataSource }>("GET", "/reports/wip");
  }

  getDispatchBoard() {
    return this.request<DispatchBoardResponse>("GET", "/dispatch/board");
  }

  listWorkOrders() {
    return this.request<{ data: WorkOrder[] }>("GET", "/dispatch/work-orders");
  }

  createWorkOrder(data: { title: string; description?: string; priority?: string; job_id?: string }) {
    return this.request<WorkOrder>("POST", "/dispatch/work-orders", data);
  }

  getWorkOrder(id: string) {
    return this.request<WorkOrder>("GET", `/dispatch/work-orders/${id}`);
  }

  updateWorkOrder(
    id: string,
    data: Partial<Pick<WorkOrder, "title" | "description" | "priority" | "status" | "job_id">>,
  ) {
    return this.request<WorkOrder>("PATCH", `/dispatch/work-orders/${id}`, data);
  }

  listWorkOrderAssignments(workOrderId: string) {
    return this.request<{ data: WorkOrderAssignment[] }>(
      "GET",
      `/dispatch/work-orders/${workOrderId}/assignments`,
    );
  }

  createWorkOrderAssignment(workOrderId: string, data: { technician_id: string }) {
    return this.request<WorkOrderAssignment>(
      "POST",
      `/dispatch/work-orders/${workOrderId}/assignments`,
      data,
    );
  }

  listExpenses() {
    return this.request<{ data: Expense[] }>("GET", "/expenses/expenses");
  }

  createExpense(data: { description: string; amount_cents: number; category?: string; job_id?: string }) {
    return this.request<Expense>("POST", "/expenses/expenses", data);
  }

  approveExpense(id: string) {
    return this.request<Expense>("POST", `/expenses/expenses/${id}/approve`, {});
  }

  listJobCosts() {
    return this.request<{ data: JobCostLine[] }>("GET", "/job-costing/job-costs");
  }

  createJobCost(data: {
    job_id: string;
    cost_code?: string;
    description?: string;
    budget_cents: number;
    actual_cents?: number;
  }) {
    return this.request<JobCostLine>("POST", "/job-costing/job-costs", data);
  }

  listChartOfAccounts() {
    return this.request<{ data: ChartOfAccount[] }>("GET", "/accounting/chart");
  }

  listAPBills() {
    return this.request<{ data: APBill[] }>("GET", "/accounting/ap");
  }

  listARAging() {
    return this.request<{ data: ARAging[] }>("GET", "/accounting/ar");
  }

  listPurchaseOrders() {
    return this.request<{ data: PurchaseOrder[] }>("GET", "/accounting/purchase-orders");
  }

  listEmployees() {
    return this.request<{ data: Employee[] }>("GET", "/payroll/employees");
  }

  createEmployee(data: {
    first_name: string;
    last_name: string;
    email?: string;
    employment_type?: string;
    hourly_rate_cents?: number;
  }) {
    return this.request<Employee>("POST", "/payroll/employees", data);
  }

  listTimesheets() {
    return this.request<{ data: Timesheet[] }>("GET", "/payroll/timesheets");
  }

  createTimeEntry(data: {
    action: "clock_in" | "clock_out";
    job_id?: string;
    latitude?: number;
    longitude?: number;
    recorded_at?: string;
  }) {
    return this.request<Timesheet>("POST", "/payroll/timesheets", {
      ...data,
      recorded_at: data.recorded_at ?? new Date().toISOString(),
    });
  }

  listPayrollRuns() {
    return this.request<{ data: PayrollRun[] }>("GET", "/payroll/runs");
  }

  createPayrollRun(data: { pay_period_start: string; pay_period_end: string }) {
    return this.request<PayrollRun>("POST", "/payroll/runs", data);
  }

  submitPayrollRun(id: string) {
    return this.request<PayrollRun>("POST", `/payroll/runs/${id}/submit`, {});
  }

  listTaxProfiles() {
    return this.request<{ data: TaxProfile[] }>("GET", "/payroll/tax-profiles");
  }

  upsertTaxProfile(data: { employee_id: string; filing_status: string; allowances: number }) {
    return this.request<TaxProfile>("POST", "/payroll/tax-profiles", data);
  }

  submitTimesheet(id: string) {
    return this.request<Timesheet>("POST", `/payroll/timesheets/${id}/submit`, {});
  }

  approveTimesheet(id: string) {
    return this.request<Timesheet>("POST", `/payroll/timesheets/${id}/approve`, {});
  }

  listProjects() {
    return this.request<{ data: Project[] }>("GET", "/construction/projects");
  }

  createProject(data: {
    name: string;
    budget_cents?: number;
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    notes?: string;
  }) {
    return this.request<Project>("POST", "/construction/projects", data);
  }

  getProject(id: string) {
    return this.request<Project>("GET", `/construction/projects/${id}`);
  }

  updateProject(
    id: string,
    data: Partial<{
      name: string;
      status: string;
      budget_cents: number;
      version: number;
      start_date: string;
      end_date: string;
      notes: string;
    }>,
  ) {
    return this.request<Project>("PATCH", `/construction/projects/${id}`, data);
  }

  listDailyLogs(projectId: string) {
    return this.request<{ data: DailyLog[] }>("GET", `/construction/projects/${projectId}/daily-logs`);
  }

  createDailyLog(
    projectId: string,
    data: { log_date?: string; weather?: string; crew_count?: number; notes?: string },
  ) {
    return this.request<DailyLog>("POST", `/construction/projects/${projectId}/daily-logs`, data);
  }

  listDailyLogPhotos(projectId: string, logId: string) {
    return this.request<{ data: DailyLogPhoto[] }>(
      "GET",
      `/construction/projects/${projectId}/daily-logs/${logId}/photos`,
    );
  }

  uploadDailyLogPhoto(
    projectId: string,
    logId: string,
    data: { caption?: string; data_url: string },
  ) {
    return this.request<DailyLogPhoto>(
      "POST",
      `/construction/projects/${projectId}/daily-logs/${logId}/photos`,
      data,
    );
  }

  listProjectPermitAlerts(projectId: string) {
    return this.request<{ data: PermitAlert[]; status: string }>(
      "GET",
      `/construction/projects/${projectId}/permit-alerts`,
    );
  }

  listSubcontractors() {
    return this.request<{ data: Subcontractor[] }>("GET", "/construction/subcontractors");
  }

  createSubcontractor(data: {
    company_name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    trade?: string;
  }) {
    return this.request<Subcontractor>("POST", "/construction/subcontractors", data);
  }

  listChangeOrders(projectId?: string) {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return this.request<{ data: ChangeOrder[] }>("GET", `/construction/change-orders${q}`);
  }

  createChangeOrder(data: {
    project_id: string;
    title: string;
    description?: string;
    amount_cents?: number;
  }) {
    return this.request<ChangeOrder>("POST", "/construction/change-orders", data);
  }

  approveChangeOrder(id: string) {
    return this.request<ChangeOrder>("POST", `/construction/change-orders/${id}/approve`, {});
  }

  submitChangeOrder(id: string) {
    return this.request<ChangeOrder>("POST", `/construction/change-orders/${id}/submit`, {});
  }

  rejectChangeOrder(id: string, reason?: string) {
    return this.request<ChangeOrder>("POST", `/construction/change-orders/${id}/reject`, {
      reason: reason ?? "",
    });
  }

  listMilestones(projectId?: string) {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return this.request<{ data: Milestone[] }>("GET", `/construction/milestones${q}`);
  }

  createMilestone(data: {
    project_id: string;
    name: string;
    percent_complete?: number;
    amount_cents?: number;
    due_date?: string;
  }) {
    return this.request<Milestone>("POST", "/construction/milestones", data);
  }

  updateMilestone(
    id: string,
    data: Partial<{
      name: string;
      percent_complete: number;
      amount_cents: number;
      status: string;
      due_date: string;
      completed_at: string;
    }>,
  ) {
    return this.request<Milestone>("PATCH", `/construction/milestones/${id}`, data);
  }

  listPermits(projectId?: string) {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return this.request<{ data: Permit[] }>("GET", `/construction/permits${q}`);
  }

  createPermit(data: {
    project_id: string;
    permit_number?: string;
    permit_type?: string;
    jurisdiction?: string;
    issued_date?: string;
    expires_date?: string;
    notes?: string;
  }) {
    return this.request<Permit>("POST", "/construction/permits", data);
  }

  listLienWaivers(projectId?: string) {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return this.request<{ data: LienWaiver[] }>("GET", `/construction/lien-waivers${q}`);
  }

  createLienWaiver(data: {
    project_id: string;
    party_name: string;
    waiver_type?: string;
    amount_cents?: number;
    notes?: string;
  }) {
    return this.request<LienWaiver>("POST", "/construction/lien-waivers", data);
  }

  listRFIs(projectId?: string) {
    const q = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return this.request<{ data: RFI[] }>("GET", `/construction/rfis${q}`);
  }

  createRFI(data: {
    project_id: string;
    subject: string;
    question?: string;
    due_date?: string;
  }) {
    return this.request<RFI>("POST", "/construction/rfis", data);
  }

  listCleanPhases(jobId?: string) {
    const q = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
    return this.request<{ data: CleanPhase[] }>("GET", `/cleaning/clean-phases${q}`);
  }

  createCleanPhase(data: { job_id: string; phase: string; notes?: string }) {
    return this.request<CleanPhase>("POST", "/cleaning/clean-phases", data);
  }

  updateCleanPhase(
    id: string,
    data: Partial<{ status: string; completed_at: string; notes: string }>,
  ) {
    return this.request<CleanPhase>("PATCH", `/cleaning/clean-phases/${id}`, data);
  }

  listRecurringCleans() {
    return this.request<{ data: RecurringClean[] }>("GET", "/cleaning/recurring-cleans");
  }

  createRecurringClean(data: { customer_id?: string; frequency?: string; phase?: string }) {
    return this.request<RecurringClean>("POST", "/cleaning/recurring-cleans", data);
  }

  listTodayCleans() {
    return this.request<TodayCleansResponse>("GET", "/cleaning/jobs");
  }

  getCleanJob(id: string) {
    return this.request<CleanJobDetail>("GET", `/cleaning/jobs/${id}`);
  }

  updateCleanChecklist(id: string, checklist: ChecklistItem[]) {
    return this.request<{ checklist: ChecklistItem[] }>("PATCH", `/cleaning/jobs/${id}/checklist`, {
      checklist,
    });
  }

  listCleanJobPhotos(jobId: string) {
    return this.request<{ data: QcPhoto[] }>("GET", `/cleaning/jobs/${jobId}/photos`);
  }

  uploadCleanJobPhoto(
    jobId: string,
    data: { kind?: "before" | "after"; caption?: string; data_url: string },
  ) {
    return this.request<QcPhoto>("POST", `/cleaning/jobs/${jobId}/photos`, data);
  }

  listQcReviews() {
    return this.request<{ data: QcReviewItem[]; status: string }>("GET", "/cleaning/qc");
  }

  listCleaningSupplies() {
    return this.request<{ data: CleaningSupply[]; status: string }>("GET", "/cleaning/supplies");
  }

  updateCleaningSupply(
    id: string,
    data: Partial<{ reorder_threshold: number; on_hand: number }>,
  ) {
    return this.request<CleaningSupply>("PATCH", `/cleaning/supplies/${id}`, data);
  }

  createCheckout(planId?: string) {
    return this.request<CheckoutSession>("POST", "/billing/checkout", planId ? { plan_id: planId } : {});
  }

  listIntegrations() {
    return this.request<{ data: IntegrationCatalogItem[] }>("GET", "/integrations/");
  }

  listIntegrationStatus() {
    return this.request<{ data: IntegrationStatus[] }>("GET", "/integrations/status");
  }

  startQuickBooksOAuth(redirectUri?: string) {
    const q = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : "";
    return this.request<QuickBooksOAuthStartResult>("GET", `/integrations/quickbooks/oauth/start${q}`);
  }

  completeQuickBooksOAuth(code: string, state?: string) {
    return this.request<IntegrationStatus>("POST", "/integrations/quickbooks/oauth/callback", { code, state });
  }

  disconnectQuickBooks() {
    return this.request<IntegrationStatus>("POST", "/integrations/quickbooks/disconnect", {});
  }

  calculateAvalaraTax(data: { amount_cents: number; ship_to_state: string; ship_to_zip?: string }) {
    return this.request<AvalaraTaxCalculation>("POST", "/integrations/avalara/tax/calculate", data);
  }

  startStripeConnectOnboarding(returnPath?: string) {
    return this.request<StripeConnectOnboarding>("POST", "/integrations/stripe-connect/onboard", {
      return_path: returnPath,
    });
  }

  completeStripeConnect(accountId: string) {
    return this.request<StripeConnectStatusResult>("POST", "/integrations/stripe-connect/complete", {
      account_id: accountId,
    });
  }

  getStripeConnectStatus() {
    return this.request<StripeConnectStatusResult>("GET", "/integrations/stripe-connect/status");
  }
}

export function createClient(baseUrl = DEFAULT_API_URL) {
  return new FieldForgeClient(baseUrl);
}
