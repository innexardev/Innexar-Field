import type { Metadata } from "next";
import { pageMetadata } from "../lib/metadata";

export const metadata: Metadata = pageMetadata("Login", "Sign in to your account.", {
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
