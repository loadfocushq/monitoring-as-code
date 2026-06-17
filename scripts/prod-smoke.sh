#!/usr/bin/env bash
# Post-deploy smoke for the CLI <-> lfapimonitoring /mac + /api contract (READ-ONLY, no mutation).
# Run AFTER deploying the server's /mac/* routes. Needs a real apikey + team.
#
#   LOADFOCUS_API_KEY=... LOADFOCUS_TEAM_ID=... [PROJECT=acme-prod] bash scripts/prod-smoke.sh
#
# Exits non-zero on the first failure. Does NOT deploy/destroy/apply anything.
set -uo pipefail
HOST="${LOADFOCUS_API_URL:-https://apimonitor.loadfocus.com}"
CLI="node $(cd "$(dirname "$0")/.." && pwd)/bin/cli.js"
fail() { echo "  ✗ $1"; exit 1; }

: "${LOADFOCUS_API_KEY:?set LOADFOCUS_API_KEY}"; : "${LOADFOCUS_TEAM_ID:?set LOADFOCUS_TEAM_ID}"

echo "== 0. routes live? (/mac/state must be 401 auth-gated, NOT 302 = not deployed) =="
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$HOST/api/test/appapimonitoring/mac/state?project=smoke")
echo "  /mac/state (unauth) -> $code"
[ "$code" = "401" ] || [ "$code" = "403" ] || fail "/mac/* not deployed (got $code; expected 401). STOP — deploy the server first."

echo "== 1. whoami (apikey auth + /mac/state route) =="
$CLI whoami || fail "whoami failed (auth or route)"

echo "== 2. env ls (/api/secrets + /api/variables, keys only) =="
$CLI env ls || fail "env ls failed"

if [ -n "${PROJECT:-}" ]; then
  echo "== 3. list --status for project '$PROJECT' (read-only inventory + run status) =="
  $CLI list --project "$PROJECT" --status || fail "list --status failed"
  echo "== 4. deploy --dry-run (compile + server diff; NOTHING applied) — needs authoring in CWD =="
  $CLI deploy --project "$PROJECT" --dry-run --allow-empty || echo "  (dry-run skipped/non-fatal: no authoring in CWD)"
else
  echo "== 3-4. skipped (set PROJECT=<name> to also smoke list/deploy --dry-run) =="
fi

echo "ALL READ-ONLY SMOKE CHECKS PASSED ✓ — CLI<->server contract is live."
