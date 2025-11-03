#!/bin/bash
#
# Claude Code Web Configuration Sync Hook
# ========================================
#
# PURPOSE:
# This hook automatically downloads and syncs Claude Code configurations
# from a ZIP file when running in Claude Code Web environment.
#
# BEHAVIOR:
# - Only runs in Claude Code Web (not Desktop)
# - Downloads ZIP from configured URL
# - Extracts to ~/.claude/ directory
# - Non-blocking: errors are reported but don't stop session startup
#
# EXIT CODES:
# - 0: Success (stdout added to Claude's context)
# - 1: Non-blocking error (stderr shown to user, session continues)
#
# ENVIRONMENT VARIABLES USED:
# - CLAUDE_CODE_REMOTE: "true" when running in Web environment
# - CLAUDE_PROJECT_DIR: Project root directory
#

# ============================================================================
# BASH SAFETY SETTINGS
# ============================================================================
# -e: Exit immediately if any command fails
# -u: Treat unset variables as an error
# -o pipefail: Pipeline fails if any command in it fails
set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================
SETTINGS_FILE="${CLAUDE_PROJECT_DIR}/.claude/additionalSettings.json"
TARGET_DIR="${HOME}/.claude"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Function: Log informational messages to stdout (added to Claude's context)
log_info() {
    echo "$1"
}

# Function: Log error messages to stderr (shown to user)
log_error() {
    echo "ERROR: $1" >&2
}

# Function: Check if required commands are available
check_dependencies() {
    local missing_deps=()

    if ! command -v jq >/dev/null 2>&1; then
        missing_deps+=("jq")
    fi

    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi

    if ! command -v unzip >/dev/null 2>&1; then
        missing_deps+=("unzip")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install them to enable configuration sync"
        return 1
    fi

    return 0
}

# Function: Validate that a path doesn't contain dangerous patterns
validate_path() {
    local path="$1"

    # Check for path traversal attempts (..)
    if [[ "$path" == *".."* ]]; then
        log_error "Path contains dangerous pattern '..' - refusing to proceed"
        return 1
    fi

    # Check for absolute paths (we want relative paths only)
    if [[ "$path" == /* ]]; then
        log_error "Absolute paths are not allowed in rootPath"
        return 1
    fi

    return 0
}

# Function: Clean up temporary files on exit
cleanup() {
    if [ -n "${TEMP_DIR:-}" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}

# Register cleanup function to run on script exit (success or failure)
trap cleanup EXIT

# ============================================================================
# MAIN LOGIC
# ============================================================================

# STEP 1: Check if running in Claude Code Web
# --------------------------------------------
# Only run this hook in the Web environment, skip on Desktop
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
    # Silent exit - this is expected behavior for Desktop users
    exit 0
fi

# STEP 2: Check if additionalSettings.json exists
# ------------------------------------------------
if [ ! -f "$SETTINGS_FILE" ]; then
    # No settings file = no configuration sync needed
    # This is not an error, just means the feature isn't configured
    exit 0
fi

# STEP 3: Check dependencies
# ---------------------------
if ! check_dependencies; then
    # Dependencies missing - exit with error but don't block session
    exit 1
fi

# STEP 4: Parse configuration from JSON file
# -------------------------------------------
# Extract ConfigZipLocation and rootPath from the settings file
CONFIG_ZIP_LOCATION=$(jq -r '.ConfigZipLocation // empty' "$SETTINGS_FILE" 2>/dev/null || echo "")
ROOT_PATH=$(jq -r '.rootPath // empty' "$SETTINGS_FILE" 2>/dev/null || echo "")

# STEP 5: Validate ConfigZipLocation
# -----------------------------------
if [ -z "$CONFIG_ZIP_LOCATION" ]; then
    # No URL configured - inform user but don't treat as error
    log_info "Skipping configuration sync: No ConfigZipLocation configured in additionalSettings.json"
    exit 0
fi

# STEP 6: Validate rootPath if provided
# --------------------------------------
if [ -n "$ROOT_PATH" ]; then
    if ! validate_path "$ROOT_PATH"; then
        # Invalid path - this is an error
        exit 1
    fi
fi

# STEP 7: Create temporary directory for download
# ------------------------------------------------
TEMP_DIR=$(mktemp -d -t claude-config-sync-XXXXXX)
ZIP_FILE="${TEMP_DIR}/configs.zip"
EXTRACT_DIR="${TEMP_DIR}/extracted"

# STEP 8: Download the ZIP file
# ------------------------------
log_info "Downloading configurations from: ${CONFIG_ZIP_LOCATION}"

if ! curl -fsSL -o "$ZIP_FILE" "$CONFIG_ZIP_LOCATION" 2>/dev/null; then
    log_error "Failed to download configuration ZIP from: ${CONFIG_ZIP_LOCATION}"
    log_error "Please check the URL and your network connection"
    exit 1
fi

# STEP 9: Validate ZIP file
# --------------------------
# Test if the downloaded file is a valid ZIP archive
if ! unzip -t "$ZIP_FILE" >/dev/null 2>&1; then
    log_error "Downloaded file is not a valid ZIP archive"
    log_error "Source: ${CONFIG_ZIP_LOCATION}"
    exit 1
fi

# STEP 10: Extract ZIP file
# --------------------------
mkdir -p "$EXTRACT_DIR"

if ! unzip -q "$ZIP_FILE" -d "$EXTRACT_DIR" 2>/dev/null; then
    log_error "Failed to extract ZIP file"
    exit 1
fi

# STEP 11: Determine source directory to copy
# --------------------------------------------
if [ -n "$ROOT_PATH" ]; then
    # User specified a specific directory within the ZIP
    SOURCE_DIR="${EXTRACT_DIR}/${ROOT_PATH}"

    # Validate that the specified path exists in the ZIP
    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "Specified rootPath '${ROOT_PATH}' not found in ZIP file"
        log_error "Available paths in ZIP:"
        find "$EXTRACT_DIR" -type d | sed 's|'"$EXTRACT_DIR"'||' | grep -v '^$' | head -10 >&2
        exit 1
    fi
else
    # No rootPath specified - use entire ZIP contents
    SOURCE_DIR="$EXTRACT_DIR"
fi

# STEP 12: Create target directory if it doesn't exist
# -----------------------------------------------------
mkdir -p "$TARGET_DIR"

# STEP 13: Copy files to ~/.claude/
# ----------------------------------
# Copy contents (not the directory itself, but its children)
# -n flag: Don't overwrite existing files (preserve user's local configs)
# -r flag: Recursive copy

log_info "Syncing configurations to ${TARGET_DIR}..."

# Count files to copy for reporting
FILE_COUNT=$(find "$SOURCE_DIR" -type f | wc -l)

if ! cp -rn "$SOURCE_DIR"/* "$TARGET_DIR/" 2>/dev/null; then
    # cp might fail if there are no files, or permission issues
    if [ "$FILE_COUNT" -eq 0 ]; then
        log_error "No files found to sync in the specified path"
        exit 1
    else
        log_error "Failed to copy configurations to ${TARGET_DIR}"
        log_error "Please check file permissions"
        exit 1
    fi
fi

# STEP 14: Success!
# -----------------
# Report success to stdout (this will be added to Claude's context)
log_info "✓ Configuration sync complete: ${FILE_COUNT} file(s) synced from ${CONFIG_ZIP_LOCATION}"
if [ -n "$ROOT_PATH" ]; then
    log_info "  Source path in ZIP: ${ROOT_PATH}"
fi
log_info "  Target directory: ${TARGET_DIR}"

# STEP 15: List synced configurations for Claude's context
# ---------------------------------------------------------
# Since SessionStart stdout is added to Claude's context, explicitly list
# all synced commands, skills, and agents so Claude knows they're available

# List slash commands
if [ -d "${TARGET_DIR}/commands" ]; then
    COMMAND_COUNT=$(find "${TARGET_DIR}/commands" -name "*.md" -type f 2>/dev/null | wc -l)
    if [ "$COMMAND_COUNT" -gt 0 ]; then
        log_info ""
        log_info "Available slash commands (${COMMAND_COUNT}):"
        find "${TARGET_DIR}/commands" -name "*.md" -type f 2>/dev/null | sort | while read cmd_file; do
            cmd_name=$(basename "$cmd_file" .md)
            # Handle subdirectories (namespaced commands like /git:sync)
            cmd_dir=$(dirname "$cmd_file")
            if [ "$cmd_dir" != "${TARGET_DIR}/commands" ]; then
                namespace=$(basename "$cmd_dir")
                log_info "  /${namespace}:${cmd_name}"
            else
                log_info "  /${cmd_name}"
            fi
        done
    fi
fi

# List skills
if [ -d "${TARGET_DIR}/skills" ]; then
    SKILL_COUNT=$(find "${TARGET_DIR}/skills" -name "SKILL.md" -type f 2>/dev/null | wc -l)
    if [ "$SKILL_COUNT" -gt 0 ]; then
        log_info ""
        log_info "Available skills (${SKILL_COUNT}):"
        find "${TARGET_DIR}/skills" -name "SKILL.md" -type f 2>/dev/null | sort | while read skill_file; do
            skill_dir=$(dirname "$skill_file")
            skill_name=$(basename "$skill_dir")
            # Try to extract description from SKILL.md frontmatter
            skill_desc=$(grep "^description:" "$skill_file" 2>/dev/null | sed 's/^description: *//' | head -1)
            if [ -n "$skill_desc" ]; then
                log_info "  - ${skill_name}: ${skill_desc}"
            else
                log_info "  - ${skill_name}"
            fi
        done
    fi
fi

# List agents
if [ -d "${TARGET_DIR}/agents" ]; then
    AGENT_COUNT=$(find "${TARGET_DIR}/agents" -maxdepth 2 -name "*.json" -o -name "*.md" -type f 2>/dev/null | wc -l)
    if [ "$AGENT_COUNT" -gt 0 ]; then
        log_info ""
        log_info "Available agents (${AGENT_COUNT} files):"
        find "${TARGET_DIR}/agents" -maxdepth 1 -type d 2>/dev/null | grep -v "^${TARGET_DIR}/agents$" | sort | while read agent_dir; do
            agent_name=$(basename "$agent_dir")
            log_info "  - ${agent_name}"
        done
    fi
fi

# Exit successfully
exit 0
