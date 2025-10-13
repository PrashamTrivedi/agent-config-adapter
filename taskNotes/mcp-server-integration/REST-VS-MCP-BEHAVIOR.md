# REST API vs MCP Protocol - Behavior Comparison

## Overview

This document explains the intentional behavior differences between REST API and MCP protocol in the Agent Config Adapter.

## Philosophy

### REST API: Convenience-First
- **Goal**: Make it easy for developers and UI to get what they need
- **Approach**: Convert on-demand, cache automatically
- **Audience**: Humans and traditional applications

### MCP Protocol: Separation of Concerns
- **Goal**: Clear distinction between context (read) and operations (write)
- **Approach**: Resources are pure reads, tools perform operations
- **Audience**: AI agents that need explicit control

## Detailed Comparison

### 1. List All Configs

| Aspect | REST API | MCP Resource | MCP Tool |
|--------|----------|--------------|----------|
| Endpoint | `GET /api/configs` | `config://list` | N/A |
| Behavior | ✅ Read from DB | ✅ Read from DB | - |
| Processing | ❌ None | ❌ None | - |
| Side Effects | ❌ None | ❌ None | - |
| **Result** | **Same** | **Same** | - |

### 2. Get Single Config

| Aspect | REST API | MCP Resource | MCP Tool |
|--------|----------|--------------|----------|
| Endpoint | `GET /api/configs/:id` | `config://{configId}` | N/A |
| Behavior | ✅ Read from DB | ✅ Read from DB | - |
| Processing | ❌ None | ❌ None | - |
| Side Effects | ❌ None | ❌ None | - |
| **Result** | **Same** | **Same** | - |

### 3. Format Conversion - **KEY DIFFERENCE**

| Aspect | REST API | MCP Resource | MCP Tool |
|--------|----------|--------------|----------|
| Endpoint | `GET /api/configs/:id/format/:format` | `config://{configId}/cached/{format}` | `convert_config` tool |
| Behavior | ✅ Check cache → Convert if needed → Cache | ✅ Read from cache only | ✅ Check cache → Convert if needed → Cache |
| Processing | ✅ May trigger AI conversion | ❌ No processing | ✅ May trigger AI conversion |
| If Not Cached | ✅ Converts and returns | ❌ Returns null | ✅ Converts and returns |
| Side Effects | ✅ Updates KV cache | ❌ None | ✅ Updates KV cache |
| **Result** | **Always returns content** | **Returns null if not cached** | **Always returns content** |

## Why This Difference?

### REST API: User Experience
```bash
# Developer wants converted config - just GET it
curl https://api.example.com/configs/abc123/format/gemini

# Response: Always gets the content (cache or convert on-demand)
{
  "content": "description = \"...\"\nprompt = \"...\"",
  "cached": false,
  "usedAI": true
}
```

**Rationale**: Convenience - users don't care about caching details.

### MCP Resource: AI Context
```json
// AI wants to know what's already available
{
  "method": "resources/read",
  "params": {
    "uri": "config://abc123/cached/gemini"
  }
}

// Response: Null if not cached (AI knows it needs to use a tool)
{
  "contents": null
}
```

**Rationale**: AI needs to explicitly decide when to trigger work.

### MCP Tool: AI Operation
```json
// AI decides to perform conversion
{
  "method": "tools/call",
  "params": {
    "name": "convert_config",
    "arguments": {
      "configId": "abc123",
      "targetFormat": "gemini"
    }
  }
}

// Response: Always gets content (converts if needed)
{
  "content": "description = \"...\"\nprompt = \"...\"",
  "cached": false,
  "usedAI": true
}
```

**Rationale**: AI explicitly triggered the operation, expects processing.

## Use Case Examples

### Use Case 1: Check If Conversion Exists

**REST API**:
```bash
# No direct way to check without triggering conversion
# Workaround: Check response metadata
curl https://api.example.com/configs/abc123/format/gemini
# Response includes "cached": true/false
```

**MCP Protocol**:
```json
// Direct check via resource (no processing)
{
  "method": "resources/read",
  "params": { "uri": "config://abc123/cached/gemini" }
}
// Returns null if not cached, content if cached
```

### Use Case 2: Get Converted Config (Don't Care About Cache)

**REST API**:
```bash
# Simple GET - always works
curl https://api.example.com/configs/abc123/format/gemini
```

**MCP Protocol**:
```json
// Use tool (not resource) to ensure conversion
{
  "method": "tools/call",
  "params": {
    "name": "convert_config",
    "arguments": {
      "configId": "abc123",
      "targetFormat": "gemini"
    }
  }
}
```

### Use Case 3: AI Workflow - Smart Caching

**MCP Protocol Workflow**:
```typescript
// Step 1: Check if cached (resource - no cost)
const cached = await readResource("config://abc123/cached/gemini");

if (cached) {
  // Use cached version
  return cached;
} else {
  // Step 2: Trigger conversion (tool - has cost)
  const converted = await callTool("convert_config", {
    configId: "abc123",
    targetFormat: "gemini"
  });
  return converted;
}
```

**REST API**:
```bash
# Single call does it all - simpler but less control
curl https://api.example.com/configs/abc123/format/gemini
```

## Summary Table

| Operation | REST API Behavior | MCP Resource Behavior | MCP Tool Behavior |
|-----------|------------------|----------------------|-------------------|
| **List configs** | Read DB | Read DB | N/A |
| **Get config** | Read DB | Read DB | N/A |
| **Format conversion (cached)** | Return cached ✅ | Return cached ✅ | Return cached ✅ |
| **Format conversion (not cached)** | Convert & cache ✅ | Return null ❌ | Convert & cache ✅ |
| **AI cost** | May trigger AI | Never triggers AI | May trigger AI |
| **Side effects** | May update cache | Never | May update cache |

## When To Use What?

### Use REST API When:
- ✅ Building a UI or traditional application
- ✅ Want simple, convenient access
- ✅ Don't need granular control over processing
- ✅ Prefer automatic caching behavior

### Use MCP Resources When:
- ✅ AI needs context without triggering work
- ✅ Want to check cache without side effects
- ✅ Building cost-conscious workflows
- ✅ Need pure read operations

### Use MCP Tools When:
- ✅ AI needs to perform operations
- ✅ Want explicit control over when processing happens
- ✅ Need to trigger conversions
- ✅ Building multi-step workflows

## Migration Path

Existing REST API users: **No changes needed** ✅

Your REST endpoints continue to work exactly as before. MCP is an additional transport option, not a replacement.

## Questions?

- **Q: Why not make REST API also require explicit conversion?**
- **A**: REST API prioritizes developer convenience. Most users want "just give me the converted config" behavior.

- **Q: Why not make MCP resources also convert on-demand?**
- **A**: MCP protocol emphasizes separation of concerns. Resources are for context (read), tools are for operations (write/process).

- **Q: Can I use both REST and MCP in the same application?**
- **A**: Yes! They share the same backend. Create via MCP, read via REST, or vice versa.

- **Q: Which should I use?**
- **A**: For AI agents → MCP. For traditional apps/UI → REST. Both work together seamlessly.
