import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendSignupAttributionToUrl,
  hasSignupAttribution,
  mergeSignupAttribution,
  parseSignupAttribution,
} from "./signupAttribution";

describe("parseSignupAttribution", () => {
  it("extracts ref and utm params", () => {
    const params = new URLSearchParams(
      "ref=partner-1&utm_source=google&utm_campaign=hero&pack=field-services",
    );
    assert.deepEqual(parseSignupAttribution(params), {
      ref: "partner-1",
      utm_source: "google",
      utm_campaign: "hero",
    });
  });

  it("ignores empty values", () => {
    const params = new URLSearchParams("ref=&utm_source=newsletter");
    assert.deepEqual(parseSignupAttribution(params), {
      utm_source: "newsletter",
    });
  });
});

describe("mergeSignupAttribution", () => {
  it("incoming values override stored values", () => {
    const merged = mergeSignupAttribution(
      { ref: "old", utm_source: "email" },
      { ref: "new", utm_campaign: "spring" },
    );
    assert.deepEqual(merged, {
      ref: "new",
      utm_source: "email",
      utm_campaign: "spring",
    });
  });
});

describe("appendSignupAttributionToUrl", () => {
  it("appends attribution without clobbering existing query params", () => {
    const href = appendSignupAttributionToUrl(
      "https://app.fieldforge.com/signup?pack=cleaning",
      { ref: "partner-9", utm_source: "landing" },
    );
    const url = new URL(href);
    assert.equal(url.searchParams.get("pack"), "cleaning");
    assert.equal(url.searchParams.get("ref"), "partner-9");
    assert.equal(url.searchParams.get("utm_source"), "landing");
  });
});

describe("hasSignupAttribution", () => {
  it("returns false for empty attribution", () => {
    assert.equal(hasSignupAttribution({}), false);
    assert.equal(hasSignupAttribution({ ref: "  " }), false);
  });

  it("returns true when any field is set", () => {
    assert.equal(hasSignupAttribution({ utm_medium: "cpc" }), true);
  });
});
