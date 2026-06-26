/** Default local API base — matches Playwright/e2e and docs (port 8081). */
export const DEFAULT_API_URL = "http://localhost:8081/api/v1";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
