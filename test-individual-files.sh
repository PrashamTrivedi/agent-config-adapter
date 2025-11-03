#!/bin/bash
# Test downloading individual plugin files

BASE_URL="${BASE_URL:-http://localhost:8787}"
EXTENSION_ID="${1:-}"

if [ -z "$EXTENSION_ID" ]; then
  echo "Usage: $0 <extension-id>"
  echo "Getting first available extension..."
  EXTENSION_ID=$(curl -s "$BASE_URL/api/extensions" | jq -r '.extensions[0].id')
  echo "Using: $EXTENSION_ID"
fi

FORMAT="${2:-claude_code}"

echo "=== Testing Individual File Downloads ==="
echo "Extension: $EXTENSION_ID"
echo "Format: $FORMAT"
echo ""

# Browse available files
echo "Available files:"
FILES=$(curl -s "$BASE_URL/plugins/$EXTENSION_ID/$FORMAT" | jq -r '.files[].path')
echo "$FILES"
echo ""

# Download each file
mkdir -p "downloads/$EXTENSION_ID/$FORMAT"
cd "downloads/$EXTENSION_ID/$FORMAT"

echo "$FILES" | while read -r FILE_PATH; do
  echo "Downloading: $FILE_PATH"
  mkdir -p "$(dirname "$FILE_PATH")"
  curl -s "$BASE_URL/plugins/$EXTENSION_ID/$FORMAT/$FILE_PATH" -o "$FILE_PATH"
done

echo ""
echo "✓ Files downloaded to: downloads/$EXTENSION_ID/$FORMAT"
tree . || ls -R .
