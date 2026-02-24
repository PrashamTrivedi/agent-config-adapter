#!/bin/bash
# SessionStart hook — downloads slash commands from ACA server
# Used by Claude Code (local + web) via .claude/settings.json

# Only run in remote (web) environments
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

ACA_BIN="/tmp/aca"
ACA_VERSION="cli-v1.0.2"
ACA_RELEASE_URL="https://github.com/PrashamTrivedi/agent-config-adapter/releases/download/${ACA_VERSION}/aca-linux-x64"

# Download ACA CLI binary if not already cached
if [ ! -x "$ACA_BIN" ]; then
  echo "Downloading ACA CLI ${ACA_VERSION}..." >&2
  curl -sfL "$ACA_RELEASE_URL" -o "$ACA_BIN"
  if [ $? -ne 0 ]; then
    echo "Failed to download ACA CLI" >&2
    exit 0  # Non-blocking: don't break the session
  fi
  chmod +x "$ACA_BIN"
fi

# Download extension containing slash commands
# Replace YOUR_EXTENSION_NAME with the actual extension name on your ACA server
EXTENSION_NAME="${ACA_EXTENSION_NAME:-YOUR_EXTENSION_NAME}"

echo "Downloading extension '${EXTENSION_NAME}'..." >&2
"$ACA_BIN" download --name "$EXTENSION_NAME" --project --verbose 2>&1

if [ $? -eq 0 ]; then
  echo "Slash commands installed and ready to use."
else
  echo "Extension download failed (non-fatal)" >&2
fi

exit 0
