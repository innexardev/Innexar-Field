#!/usr/bin/env bash
# Platform admin API smoke test (curl). Requires curl and jq.
set -euo pipefail

API_URL="${PLAYWRIGHT_API_URL:-http://127.0.0.1:8081}"
API_V1="${API_URL}/api/v1"
EMAIL="${PLATFORM_ADMIN_EMAIL:-admin@fieldforge.local}"
PASSWORD="${PLATFORM_ADMIN_PASSWORD:-Admin123!}"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "PASS: $*"
}

command -v jq >/dev/null 2>&1 || fail "jq is required"

health_code="$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health")"
[[ "${health_code}" == "200" ]] || fail "API health (${health_code})"
pass "API health"

login_body="$(curl -sf -X POST "${API_V1}/platform/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")" || fail "platform login"
TOKEN="$(echo "${login_body}" | jq -r .token)"
[[ -n "${TOKEN}" && "${TOKEN}" != "null" ]] || fail "platform login (no token)"
pass "platform login (${EMAIL})"

PLAN_ID="smoke-$(date +%s)"
create_tmp="$(mktemp)"
trap 'rm -f "${create_tmp}"' EXIT

create_code="$(curl -s -o "${create_tmp}" -w "%{http_code}" -X POST "${API_V1}/platform/plans" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${PLAN_ID}\",\"name\":\"Smoke Test Plan\"}")"
[[ "${create_code}" == "201" ]] || fail "create plan (${create_code}): $(cat "${create_tmp}")"
pass "create plan ${PLAN_ID}"

list_body="$(curl -sf -H "Authorization: Bearer ${TOKEN}" "${API_V1}/platform/plans")" \
  || fail "list plans"
echo "${list_body}" | jq -e --arg id "${PLAN_ID}" '.data[] | select(.id == $id)' >/dev/null \
  || fail "list plans (missing ${PLAN_ID})"
pass "list plans"

delete_code="$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${API_V1}/platform/plans/${PLAN_ID}" \
  -H "Authorization: Bearer ${TOKEN}")"
[[ "${delete_code}" == "204" ]] || fail "delete plan (${delete_code})"
pass "delete plan ${PLAN_ID}"

tenants_code="$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" "${API_V1}/platform/tenants")"
[[ "${tenants_code}" == "200" ]] || fail "list tenants (${tenants_code})"
pass "list tenants (200)"

echo "All platform admin smoke checks passed."
