#!/usr/bin/env bash
# Run all MemeLaunch test suites.
# Usage:
#   ./scripts/run-tests.sh                 # localhost:3000
#   TEST_URL=https://your-app.vercel.app ./scripts/run-tests.sh

set -euo pipefail

URL="${TEST_URL:-http://localhost:3000}"
export TEST_URL="$URL"

echo ""
echo "=================================================="
echo "  MemeLaunch Test Runner  →  $URL"
echo "=================================================="

# 1. Smoke test (original, quick)
echo ""
echo "── 1/3  Smoke Test ────────────────────────────────"
npx tsx scripts/smoke-test.ts

# 2. Full API test
echo ""
echo "── 2/3  Full API Test ─────────────────────────────"
npx tsx scripts/api-test.ts

# 3. Page render test
echo ""
echo "── 3/3  Page Render Test ──────────────────────────"
npx tsx scripts/pages-test.ts

echo ""
echo "✅  All suites passed!"
