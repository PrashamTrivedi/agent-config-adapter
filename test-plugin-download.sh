#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:8787}"
OUTPUT_DIR="${OUTPUT_DIR:-./test-downloads}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Plugin Download and Extraction Test ===${NC}\n"

# Create output directory
mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

# Get list of extensions
echo -e "${GREEN}1. Fetching available extensions...${NC}"
EXTENSIONS=$(curl -s "$BASE_URL/api/extensions")
echo "$EXTENSIONS" | jq -r '.extensions[] | "\(.id) - \(.name)"'

# Prompt for extension ID (or use first one)
EXTENSION_ID=$(echo "$EXTENSIONS" | jq -r '.extensions[0].id')
echo -e "\n${GREEN}Using extension ID: $EXTENSION_ID${NC}\n"

# Test 1: Download Claude Code format
echo -e "${GREEN}2. Downloading Claude Code plugin...${NC}"
curl -o "claude_code.zip" "$BASE_URL/plugins/$EXTENSION_ID/claude_code/download"
unzip -q claude_code.zip -d claude_code
echo "✓ Extracted to: ./claude_code/"
tree claude_code || ls -R claude_code

# Test 2: Download Gemini format (ZIP)
echo -e "\n${GREEN}3. Downloading Gemini plugin ZIP...${NC}"
curl -o "gemini.zip" "$BASE_URL/plugins/$EXTENSION_ID/gemini/download"
unzip -q gemini.zip -d gemini
echo "✓ Extracted to: ./gemini/"
tree gemini || ls -R gemini

# Test 3: Download Gemini JSON definition (recommended)
echo -e "\n${GREEN}4. Downloading Gemini JSON definition...${NC}"
curl -o "gemini_definition.json" "$BASE_URL/plugins/$EXTENSION_ID/gemini/definition"
echo "✓ Downloaded to: ./gemini_definition.json"
cat gemini_definition.json | jq .

# Test 4: Browse plugin files
echo -e "\n${GREEN}5. Browsing plugin files...${NC}"
curl -s "$BASE_URL/plugins/$EXTENSION_ID/claude_code" | jq .

# Test 5: Test marketplace download (if available)
echo -e "\n${GREEN}6. Testing marketplace download...${NC}"
MARKETPLACES=$(curl -s "$BASE_URL/api/marketplaces")
MARKETPLACE_ID=$(echo "$MARKETPLACES" | jq -r '.marketplaces[0].id // empty')

if [ -n "$MARKETPLACE_ID" ]; then
  echo "Using marketplace ID: $MARKETPLACE_ID"

  # Download Gemini marketplace definition
  curl -o "marketplace_definition.json" "$BASE_URL/plugins/marketplaces/$MARKETPLACE_ID/gemini/definition"
  echo "✓ Downloaded marketplace definition"
  cat marketplace_definition.json | jq .

  # Download complete marketplace ZIP
  curl -o "marketplace.zip" "$BASE_URL/plugins/marketplaces/$MARKETPLACE_ID/download?format=gemini"
  unzip -q marketplace.zip -d marketplace
  echo "✓ Extracted marketplace to: ./marketplace/"
  tree marketplace || ls -R marketplace
else
  echo "No marketplaces available to test"
fi

echo -e "\n${GREEN}=== Test Complete ===${NC}"
echo -e "All downloads are in: $OUTPUT_DIR"
