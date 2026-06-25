#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "docs/README.md",
  "docs/domain/context-map.md",
  "docs/domain/glossary.md",
  "docs/domain/aggregates.md",
  "docs/domain/events.md",
  "docs/adr/0001-plugin-architecture.md",
  "docs/adr/0002-multitenant-rls.md",
  "docs/adr/0003-event-outbox-saga.md",
  "docs/adr/0004-resilience-integrations.md",
  "docs/security/threat-model.md",
  "docs/security/secrets.md",
  "docs/security/api-security.md",
  "docs/ops/slo.md",
  "docs/ops/disaster-recovery.md",
  "docs/ops/dora-metrics.md",
  "docs/ops/runbooks/deploy.md",
  "docs/ops/runbooks/rollback.md",
  "docs/ops/runbooks/incident-response.md",
  "docs/compliance/ccpa-data-map.md",
  "config/app.config.yaml",
  ".github/DOD.md",
  "docs/api/openapi.yaml",
  "packages/core/resilience/README.md",
  ".github/workflows/ci.yml",
];

const missing = required.filter((f) => !fs.existsSync(path.join(root, f)));

if (missing.length) {
  console.error("Missing required documentation:\n", missing.map((m) => `  - ${m}`).join("\n"));
  process.exit(1);
}

console.log(`Documentation validation passed (${required.length} files).`);
