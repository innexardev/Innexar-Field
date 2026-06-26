"use client";

import Link from "next/link";
import { appendSignupAttributionToUrl } from "@fieldforge/platform";
import { useEffect, useState, type ComponentProps } from "react";

type SignupLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function SignupLink({ href, ...props }: SignupLinkProps) {
  const [resolvedHref, setResolvedHref] = useState(href);

  useEffect(() => {
    setResolvedHref(appendSignupAttributionToUrl(href));
  }, [href]);

  return <Link href={resolvedHref} {...props} />;
}
