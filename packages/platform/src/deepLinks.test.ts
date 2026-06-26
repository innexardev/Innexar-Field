import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseJobDeepLink } from "./deepLinks";

const config = { host: "app.fieldforge.com" };

describe("parseJobDeepLink", () => {
  it("parses a universal link to a job detail screen", () => {
    const route = parseJobDeepLink("https://app.fieldforge.com/m/jobs/job-42", config);
    assert.deepEqual(route, {
      path: "/m/jobs/job-42",
      params: {},
      jobId: "job-42",
    });
  });

  it("preserves query params on job links", () => {
    const route = parseJobDeepLink(
      "https://app.fieldforge.com/m/jobs/job-42?ref=email",
      config,
    );
    assert.deepEqual(route, {
      path: "/m/jobs/job-42",
      params: { ref: "email" },
      jobId: "job-42",
    });
  });

  it("returns null for the jobs list path without an id", () => {
    assert.equal(parseJobDeepLink("https://app.fieldforge.com/m/jobs", config), null);
  });

  it("returns null for non-job mobile paths", () => {
    assert.equal(parseJobDeepLink("https://app.fieldforge.com/m/time", config), null);
  });

  it("returns null when the host does not match", () => {
    assert.equal(
      parseJobDeepLink("https://evil.example.com/m/jobs/job-42", config),
      null,
    );
  });

  it("returns null for malformed URLs", () => {
    assert.equal(parseJobDeepLink("not-a-url", config), null);
  });

  it("respects custom jobs_path from config", () => {
    const custom = {
      host: "app.fieldforge.com",
      pathPrefix: "/m",
      jobsPath: "/m/work",
    };
    const route = parseJobDeepLink("https://app.fieldforge.com/m/work/wo-9", custom);
    assert.deepEqual(route, {
      path: "/m/work/wo-9",
      params: {},
      jobId: "wo-9",
    });
  });
});
