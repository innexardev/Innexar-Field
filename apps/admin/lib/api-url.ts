/** Default local API base — matches API gateway (port 8081). */
export const DEFAULT_API_URL = "http://localhost:8081/api/v1";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;

export const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3001";
