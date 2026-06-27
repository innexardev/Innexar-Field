/** FAQ category and item keys — copy lives in i18n `help.faq.categories.*`. */
export const FAQ_CATEGORIES = [
  {
    id: "billing",
    items: ["subscription", "paymentMethods", "saasInvoices"],
  },
  {
    id: "integrations",
    items: ["connectStripe", "quickbooksSync", "emailDelivery"],
  },
  {
    id: "crm",
    items: ["addCustomer", "properties", "pipeline"],
  },
  {
    id: "fieldApp",
    items: ["mobileAccess", "offlineSync", "timeTracking"],
  },
  {
    id: "portal",
    items: ["customerLogin", "portalInvoices", "portalSupport"],
  },
] as const;

export type FaqCategoryId = (typeof FAQ_CATEGORIES)[number]["id"];

/** Manual article slugs — copy lives in i18n `help.manual.articles.*`. */
export const MANUAL_ARTICLES = [
  { slug: "getting-started", steps: ["step1", "step2", "step3", "step4"] },
  { slug: "customers", steps: ["step1", "step2", "step3", "step4"] },
  { slug: "estimates", steps: ["step1", "step2", "step3", "step4", "step5"] },
  { slug: "dispatch", steps: ["step1", "step2", "step3", "step4"] },
  { slug: "payroll", steps: ["step1", "step2", "step3", "step4"] },
  { slug: "portal", steps: ["step1", "step2", "step3", "step4"] },
  { slug: "admin", steps: ["step1", "step2", "step3", "step4"] },
  {
    slug: "integrations",
    steps: ["step1", "step2", "step3", "step4"],
    extraSections: [
      { id: "quickbooks", steps: ["step1", "step2", "step3", "step4", "step5"] },
      { id: "avalara", steps: ["step1", "step2", "step3"] },
      { id: "smtp", steps: ["step1", "step2", "step3"] },
    ],
  },
] as const;

export type ManualSlug = (typeof MANUAL_ARTICLES)[number]["slug"];

export function getManualArticle(slug: string) {
  return MANUAL_ARTICLES.find((article) => article.slug === slug);
}

export const MANUAL_SLUGS = MANUAL_ARTICLES.map((article) => article.slug);
