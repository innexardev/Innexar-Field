"use client";

import { captureSignupAttributionFromLocation } from "@fieldforge/platform";
import { useEffect } from "react";

export function AttributionCapture() {
  useEffect(() => {
    captureSignupAttributionFromLocation();
  }, []);
  return null;
}
