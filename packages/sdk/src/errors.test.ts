import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AppError,
  formatErrorForUser,
  isAppError,
  isRetryable,
  parseApiError,
  parseFetchError,
} from "./errors";

describe("parseApiError", () => {
  it("maps 401 invalid credentials to a friendly login message", () => {
    const response = new Response(null, { status: 401 });
    const err = parseApiError(response, { error: { message: "invalid credentials" } });
    assert.equal(err.code, "UNAUTHORIZED");
    assert.equal(err.userMessage, "Invalid email or password.");
  });

  it("maps 400 validation errors to server message", () => {
    const response = new Response(null, { status: 400 });
    const err = parseApiError(response, { error: { message: "email already registered" } });
    assert.equal(err.code, "VALIDATION");
    assert.equal(err.userMessage, "email already registered");
  });

  it("maps 429 to rate limited", () => {
    const response = new Response(null, { status: 429 });
    const err = parseApiError(response, {});
    assert.equal(err.code, "RATE_LIMITED");
    assert.match(err.userMessage, /too many requests/i);
  });

  it("maps 500 to server error", () => {
    const response = new Response(null, { status: 500 });
    const err = parseApiError(response, {});
    assert.equal(err.code, "SERVER_ERROR");
    assert.match(err.userMessage, /something went wrong/i);
  });
});

describe("parseFetchError", () => {
  it("maps Failed to fetch to CORS_ERROR", () => {
    const err = parseFetchError(new TypeError("Failed to fetch"));
    assert.equal(err.code, "CORS_ERROR");
    assert.match(err.userMessage, /unable to reach the api/i);
  });

  it("maps AbortError to NETWORK_ERROR", () => {
    const err = parseFetchError(new DOMException("Aborted", "AbortError"));
    assert.equal(err.code, "NETWORK_ERROR");
    assert.match(err.userMessage, /cancelled/i);
  });

  it("passes through AppError", () => {
    const original = new AppError({
      code: "FORBIDDEN",
      message: "nope",
      userMessage: "No access",
    });
    assert.equal(parseFetchError(original), original);
  });
});

describe("formatErrorForUser", () => {
  it("returns userMessage from AppError", () => {
    const err = new AppError({
      code: "VALIDATION",
      message: "bad",
      userMessage: "Fix your form",
    });
    assert.equal(formatErrorForUser(err), "Fix your form");
  });

  it("falls back for unknown errors", () => {
    assert.equal(formatErrorForUser("boom"), "Something went wrong. Please try again.");
  });
});

describe("isRetryable", () => {
  it("returns true for transient errors", () => {
    assert.equal(
      isRetryable(
        new AppError({ code: "SERVER_ERROR", message: "x", userMessage: "y" }),
      ),
      true,
    );
  });

  it("returns false for validation errors", () => {
    assert.equal(
      isRetryable(
        new AppError({ code: "VALIDATION", message: "x", userMessage: "y" }),
      ),
      false,
    );
  });
});

describe("isAppError", () => {
  it("detects AppError instances", () => {
    const err = new AppError({ code: "UNKNOWN", message: "x", userMessage: "y" });
    assert.equal(isAppError(err), true);
    assert.equal(isAppError(new Error("nope")), false);
  });
});
