# Testing Lazy Analysis Feature

## How to Test in the UI/API

Since the frontend UI wasn't implemented in this MVP, here's how to test the lazy analysis feature:

### Method 1: REST API Testing (Recommended)

#### Step 1: Create a slash command WITHOUT analyzer (simulates old config)

```bash
# This simulates an "old" slash command created before the feature existed
# We'll manually insert it without metadata

npx wrangler d1 execute agent-config-adapter --local --command="
INSERT INTO configs (id, name, type, original_format, content, created_at, updated_at)
VALUES (
  'test-lazy-123',
  'Test Lazy Analysis',
  'slash_command',
  'claude_code',
  '---
name: test-command
description: A test command
argument-hint: task description
---

Complete the following task: \$ARGUMENTS

Use the **triage** agent to analyze the issue first.',
  datetime('now'),
  datetime('now')
);
"
```

#### Step 2: Verify it has NO metadata

```bash
npx wrangler d1 execute agent-config-adapter --local --command="
SELECT id, name, has_arguments, agent_references, skill_references, analysis_version
FROM configs
WHERE id = 'test-lazy-123';
"
```

**Expected Output:**
```
id: test-lazy-123
name: Test Lazy Analysis
has_arguments: null
agent_references: null
skill_references: null
analysis_version: null
```

#### Step 3: Access the config via GET endpoint (triggers lazy analysis)

```bash
# Start the dev server in one terminal
npm run dev

# In another terminal, fetch the config
curl http://localhost:8787/api/slash-commands/test-lazy-123
```

**What happens:**
1. ConfigService.getConfig() detects no `analysis_version`
2. Triggers SlashCommandAnalyzerService.analyze()
3. Detects: has_arguments=true, agent_references=["triage"]
4. Updates database with metadata
5. Returns config with metadata

#### Step 4: Check the database again (should have metadata now)

```bash
npx wrangler d1 execute agent-config-adapter --local --command="
SELECT id, name, has_arguments, argument_hint, agent_references, skill_references, analysis_version
FROM configs
WHERE id = 'test-lazy-123';
"
```

**Expected Output:**
```
id: test-lazy-123
name: Test Lazy Analysis
has_arguments: 1
argument_hint: task description
agent_references: ["triage"]
skill_references: []
analysis_version: 1.0
```

#### Step 5: Access again (should use cached metadata, no re-analysis)

```bash
curl http://localhost:8787/api/slash-commands/test-lazy-123
```

**What happens:**
- ConfigService.getConfig() sees `analysis_version = 1.0`
- Skips analysis (already done)
- Returns config immediately

---

### Method 2: Browser DevTools

If you have the dev server running, you can test in the browser:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser to:** `http://localhost:8787`

3. **Open DevTools** (F12) → Console tab

4. **Fetch an existing slash command:**
   ```javascript
   // Fetch the test config we created
   fetch('http://localhost:8787/api/slash-commands/test-lazy-123')
     .then(r => r.json())
     .then(data => {
       console.log('Config:', data);
       console.log('Has metadata?', !!data.config.analysis_version);
       console.log('Has arguments?', data.config.has_arguments);
       console.log('Agent refs:', data.config.agent_references);
     });
   ```

5. **Check server logs** for lazy analysis message:
   ```
   Lazy analyzing slash command: Test Lazy Analysis (test-lazy-123)
   ```

---

### Method 3: Check with Real Existing Configs

If you already have slash commands in your database:

#### Find slash commands without metadata

```bash
npx wrangler d1 execute agent-config-adapter --local --command="
SELECT id, name, type, analysis_version
FROM configs
WHERE type = 'slash_command'
  AND analysis_version IS NULL
LIMIT 5;
"
```

#### Pick one and fetch it

```bash
# Replace {id} with actual config ID
curl http://localhost:8787/api/slash-commands/{id}
```

#### Verify metadata was added

```bash
npx wrangler d1 execute agent-config-adapter --local --command="
SELECT id, name, has_arguments, agent_references, analysis_version
FROM configs
WHERE id = '{id}';
"
```

---

### Method 4: Test the Conversion Endpoint

The conversion endpoint also triggers lazy analysis:

```bash
# POST to convert endpoint (will analyze if needed)
curl -X POST http://localhost:8787/api/slash-commands/test-lazy-123/convert \
  -H "Content-Type: application/json" \
  -d '{
    "userArguments": "Fix the login bug"
  }'
```

**Response will include:**
```json
{
  "convertedContent": "Complete the following task: Fix the login bug\n\n[Agent references inlined or omitted]",
  "needsUserInput": false,
  "analysis": {
    "hasArguments": true,
    "argumentHint": "task description",
    "agentReferences": ["triage"],
    "skillReferences": []
  }
}
```

---

## What to Look For

### ✅ Success Indicators

1. **Server logs show:**
   ```
   Lazy analyzing slash command: {name} ({id})
   ```

2. **Database updated with metadata:**
   - `has_arguments` is 0 or 1 (not null)
   - `analysis_version` is "1.0"
   - `agent_references` and `skill_references` are JSON arrays or null

3. **Subsequent calls are fast:**
   - No "Lazy analyzing" log message
   - Database shows existing metadata
   - Response includes analysis data

### ❌ Failure Indicators

1. **Metadata still null after fetch:**
   - Check if analyzer was passed to ConfigService
   - Check AI Gateway credentials
   - Check server error logs

2. **"Lazy analysis failed" in logs:**
   - AI call failed (check API key)
   - Falls back to returning original config
   - Non-blocking - config still returned

---

## Expected Flow Timeline

```
Time 0: Config created without metadata (simulating old config)
  └─ has_arguments: null
  └─ analysis_version: null

Time 1: First GET /api/slash-commands/:id
  ├─ Detects missing analysis_version
  ├─ Runs AI analysis (takes ~500ms)
  ├─ Updates database with metadata
  └─ Returns config with metadata

Time 2: Second GET /api/slash-commands/:id
  ├─ Sees analysis_version = "1.0"
  ├─ Skips analysis (instant)
  └─ Returns config with cached metadata
```

---

## Production Testing

For production environment, use `--remote` flag:

```bash
# Check remote database for unanalyzed configs
npx wrangler d1 execute agent-config-adapter --remote --command="
SELECT COUNT(*) as unanalyzed_count
FROM configs
WHERE type = 'slash_command'
  AND analysis_version IS NULL;
"

# Access via production URL to trigger lazy analysis
curl https://your-production-url.workers.dev/api/slash-commands/{id}
```

---

## Troubleshooting

### Problem: Analysis not running

**Check:**
1. Is analyzer passed to ConfigService?
   ```typescript
   const analyzer = new SlashCommandAnalyzerService(aiConverter);
   const configService = new ConfigService(c.env, analyzer); // ← Must pass analyzer
   ```

2. Is OPENAI_API_KEY set?
   ```bash
   # Check .dev.vars file
   cat .dev.vars | grep OPENAI_API_KEY
   ```

3. Are AI Gateway settings correct?
   ```bash
   # Check environment
   echo $ACCOUNT_ID
   echo $GATEWAY_ID
   ```

### Problem: Analysis keeps re-running

**Check:**
- Database update failing?
- `analysis_version` not being set?
- Run: `SELECT * FROM configs WHERE id = '{id}'` to verify

---

## Future: Frontend UI

When the frontend UI is built, you'll be able to:

1. **List all slash commands** - See which have metadata
2. **View details** - Trigger lazy analysis on click
3. **Convert interface** - Shows analysis results
4. **Visual indicators** - Badge showing "Analyzed" or "Analyzing..."

For now, use the API methods above to test the feature!
