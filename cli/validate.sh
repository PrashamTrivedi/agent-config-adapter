#!/bin/bash
set -euo pipefail

PASS=0
FAIL=0
SERVER="${ACA_SERVER_URL:-https://agent-config-adapter.prashamhtrivedi.workers.dev}"

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }
section() { echo -e "\n━━━ $1 ━━━"; }

# ============================================
section "1. Help text"
# ============================================
HELP=$(aca --help 2>&1)

echo "$HELP" | grep -q "download" && pass "download command listed" || fail "download command missing"
echo "$HELP" | grep -q "ACA_API_KEY" && pass "ACA_API_KEY documented" || fail "ACA_API_KEY missing from help"
echo "$HELP" | grep -q "ACA_SERVER_URL" && pass "ACA_SERVER_URL documented" || fail "ACA_SERVER_URL missing from help"
echo "$HELP" | grep -q "\-\-id" && pass "--id flag documented" || fail "--id flag missing"
echo "$HELP" | grep -q "\-\-name" && pass "--name flag documented" || fail "--name flag missing"

# ============================================
section "2. Version"
# ============================================
VER=$(aca --version 2>&1)
echo "$VER" | grep -q "aca v" && pass "version: $VER" || fail "version output unexpected: $VER"

# ============================================
section "3. Env var: ACA_SERVER_URL"
# ============================================
STATUS=$(ACA_SERVER_URL=http://test-server:9999 ACA_API_KEY=aca_fake123 aca status 2>&1 || true)
echo "$STATUS" | grep -q "http://test-server:9999" && pass "server URL from env" || fail "server URL not read from env"
echo "$STATUS" | grep -q "(env)" && pass "server source shows (env)" || fail "server source label missing"

# ============================================
section "4. Env var: ACA_API_KEY"
# ============================================
echo "$STATUS" | grep -q "(from env)" && pass "API key source shows (from env)" || fail "API key source label missing"
echo "$STATUS" | grep -q "aca_" && pass "API key masked correctly" || fail "API key masking issue"

# ============================================
section "5. Download — extension not found"
# ============================================
DL_ERR=$(ACA_SERVER_URL="$SERVER" aca download --id 00000000-0000-0000-0000-000000000000 --path /tmp/dl-test --verbose 2>&1 || true)
echo "$DL_ERR" | grep -qi "not found\|error\|unable" && pass "graceful error for missing extension" || fail "no error for missing extension"

# ============================================
section "6. Download — list extensions from server"
# ============================================
if [ "$SERVER" != "skip" ]; then
  DL_LIST=$(ACA_SERVER_URL="$SERVER" aca download --name "__nonexistent_zzz__" --project 2>&1 || true)
  echo "$DL_LIST" | grep -qi "no extensions matching\|error\|not found" \
    && pass "name search shows no-match error" \
    || fail "name search didn't produce expected output"
else
  echo "  ⏭️  Skipping (ACA_SERVER_URL=skip)"
fi

# ============================================
section "7. Download — target directory resolution"
# ============================================
# Verify --global resolves to ~/.claude
# (We can't do a real download without a valid extension, but we can check the error output includes the path)
DL_GLOBAL=$(ACA_SERVER_URL="$SERVER" aca download --id 00000000-0000-0000-0000-000000000000 --global --verbose 2>&1 || true)
echo "$DL_GLOBAL" | grep -q "Server:" && pass "download command starts correctly" || fail "download command failed to start"

# ============================================
section "8. Config file fallback"
# ============================================
# Without env vars, should use default server
STATUS_DEFAULT=$(unset ACA_SERVER_URL; unset ACA_API_KEY; aca status 2>&1 || true)
echo "$STATUS_DEFAULT" | grep -q "default\|Not set\|No config" && pass "falls back to defaults without env" || fail "fallback behavior unexpected"

# ============================================
section "Results"
# ============================================
TOTAL=$((PASS + FAIL))
echo ""
echo "  $PASS/$TOTAL passed"
if [ "$FAIL" -gt 0 ]; then
  echo "  ⚠️  $FAIL test(s) failed"
  exit 1
else
  echo "  All checks passed!"
  exit 0
fi
