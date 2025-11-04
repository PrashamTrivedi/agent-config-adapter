# Purpose

Add refresh analysis buttons and search functionality to slash command converter interface

## Original Ask

- We need a refresh analysis button in GET configs/:id page when the config is slash command.
And slashCommands convert page when we select slash commands.

- We need search slash commands by name in slash-commands/convert page

## Complexity and the reason behind it

**Complexity Score: 1/5**

**Reasoning:**
- Simple UI enhancements to existing feature
- Straightforward endpoint to trigger re-analysis
- Search functionality follows existing pattern from configs list page
- No database schema changes required
- No new service layer components needed
- Reuses existing SlashCommandAnalyzerService
- All infrastructure already in place

This is a simple enhancement task that adds polish to the existing slash command converter feature.

## Architectural changes required

None - all existing services and infrastructure are sufficient.

## Backend changes required

### 1. New API Endpoint - Refresh Analysis

**File:** `src/routes/configs.ts`

Add a new endpoint to manually trigger re-analysis of a slash command:

```typescript
// POST /api/configs/:id/refresh-analysis
// Manually trigger re-analysis of a slash command
configsRouter.post('/:id/refresh-analysis', async (c) => {
  const id = c.req.param('id');

  // Initialize analyzer
  const apiKey = c.env.OPENAI_API_KEY || '';
  const accountId = c.env.ACCOUNT_ID;
  const gatewayId = c.env.GATEWAY_ID;
  const aiGatewayToken = c.env.AI_GATEWAY_TOKEN;

  const aiConverter = new AIConverterService(apiKey, accountId, gatewayId, aiGatewayToken);
  const analyzer = new SlashCommandAnalyzerService(aiConverter);
  const configService = new ConfigService(c.env, analyzer);

  const config = await configService.getConfig(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  if (config.type !== 'slash_command') {
    return c.json({ error: 'Config is not a slash command' }, 400);
  }

  try {
    // Run analysis
    const analysis = await analyzer.analyze(config.content);

    // Update config with fresh analysis
    await configService.updateConfig(id, { content: config.content });

    // Check if request wants HTML (from HTMX) or JSON (from API)
    const accept = c.req.header('Accept') || '';
    const wantsHtml = accept.includes('text/html') || c.req.header('HX-Request') === 'true';

    if (wantsHtml) {
      return c.html(`
        <p style="color: #4caf50; font-size: 0.875em;">
          ✓ Analysis refreshed successfully.
          Detected: ${analysis.hasArguments ? 'Arguments required' : 'No arguments'},
          ${analysis.agentReferences.length} agent(s),
          ${analysis.skillReferences.length} skill(s)
        </p>
      `);
    }

    return c.json({
      success: true,
      message: 'Analysis refreshed',
      analysis
    });
  } catch (error) {
    console.error('Analysis refresh failed:', error);

    const accept = c.req.header('Accept') || '';
    const wantsHtml = accept.includes('text/html') || c.req.header('HX-Request') === 'true';

    if (wantsHtml) {
      return c.html(
        '<p style="color: var(--danger);">Analysis refresh failed. Please try again.</p>',
        500
      );
    }

    return c.json({ error: 'Analysis refresh failed' }, 500);
  }
});
```

**Notes:**
- Reuses existing analyzer service
- Returns HTMX-friendly HTML or JSON based on request
- Validates config type before attempting analysis
- Provides detailed success message with analysis summary

### 2. Update Slash Command Converter Routes

**File:** `src/routes/slash-command-converter.ts`

Add search functionality to the listing endpoint:

```typescript
// GET /slash-commands/convert
// Main converter UI page with search support
slashCommandConverterRouter.get('/convert', async (c) => {
  const configService = new ConfigService(c.env);

  // Get search query
  const search = c.req.query('search');

  // Build filters
  const filters: { type: string; searchName?: string } = {
    type: 'slash_command'
  };

  if (search) {
    filters.searchName = search;
  }

  // Get all slash commands with filters
  const configs = await configService.listConfigs(filters);

  // Check if this is an HTMX request (partial update)
  const isHtmxRequest = c.req.header('HX-Request') === 'true';

  if (isHtmxRequest) {
    // Return just the dropdown options
    return c.html(slashCommandConverterDropdownPartial(configs, search));
  }

  return c.html(slashCommandConverterView(configs, search));
});
```

**Notes:**
- Adds search parameter support
- Returns partial HTML for HTMX dropdown updates
- Uses existing ConfigService search functionality

## Frontend changes required

### 1. Add Refresh Button to Config Detail View

**File:** `src/views/configs.ts`

Update `configDetailView` function to add refresh analysis button for slash commands:

```typescript
export function configDetailView(config: Config): string {
  const isSlashCommand = config.type === 'slash_command';

  const content = `
    <h2>${config.name}</h2>
    <div style="margin-bottom: 20px;">
      <span class="badge">${config.type}</span>
      <span class="badge">${config.original_format}</span>
    </div>

    ${isSlashCommand ? `
      <div style="margin-bottom: 20px; padding: 15px; background-color: var(--background-secondary); border-radius: 4px;">
        <h3 style="margin-top: 0;">Slash Command Analysis</h3>
        <ul style="margin-left: 20px;">
          <li>Requires arguments: ${config.has_arguments ? 'Yes' : 'No'}</li>
          ${config.argument_hint ? `<li>Argument hint: ${escapeHtml(config.argument_hint)}</li>` : ''}
          ${config.agent_references ? `
            <li>Agent references: ${JSON.parse(config.agent_references).map((a: string) => escapeHtml(a)).join(', ')}</li>
          ` : '<li>Agent references: None</li>'}
          ${config.skill_references ? `
            <li>Skill references: ${JSON.parse(config.skill_references).map((s: string) => escapeHtml(s)).join(', ')}</li>
          ` : '<li>Skill references: None</li>'}
          ${config.analysis_version ? `<li>Analysis version: ${config.analysis_version}</li>` : ''}
        </ul>

        <button
          class="btn btn-secondary"
          hx-post="/api/configs/${config.id}/refresh-analysis"
          hx-target="#analysis-status"
          hx-swap="innerHTML"
          style="margin-top: 10px;">
          🔄 Refresh Analysis
        </button>
        <span style="font-size: 0.875em; color: var(--text-secondary); margin-left: 10px;">
          (Re-analyzes command for arguments and references)
        </span>

        <div id="analysis-status" style="margin-top: 10px;"></div>
      </div>
    ` : ''}

    <h3>Original Content</h3>
    <pre>${escapeHtml(config.content)}</pre>

    <h3>Convert to Different Formats</h3>
    <div style="margin-bottom: 20px;">
      <button class="btn" hx-get="/api/configs/${config.id}/format/claude_code" hx-target="#converted">
        Claude Code
      </button>
      <button class="btn" hx-get="/api/configs/${config.id}/format/codex" hx-target="#converted">
        Codex
      </button>
      <button class="btn" hx-get="/api/configs/${config.id}/format/gemini" hx-target="#converted">
        Gemini
      </button>
    </div>

    <div id="converted"></div>

    <h3>Actions</h3>
    <div style="margin-bottom: 20px;">
      <button
        class="btn"
        hx-post="/api/configs/${config.id}/invalidate"
        hx-target="#cache-status"
        hx-swap="innerHTML">
        Refresh Conversions
      </button>
      <span style="font-size: 0.875em; color: var(--text-secondary); margin-left: 10px;">
        (Clears cached conversions and forces re-processing)
      </span>
    </div>
    <div id="cache-status"></div>

    <div style="margin-top: 30px;">
      <a href="/configs/${config.id}/edit" class="btn">Edit</a>
      <a href="/configs" class="btn btn-secondary">Back to List</a>
      <button
        class="btn btn-danger"
        hx-delete="/api/configs/${config.id}"
        hx-confirm="Are you sure you want to delete this config?"
        hx-target="body"
        hx-swap="outerHTML">
        Delete
      </button>
    </div>

    <script>
      // Handle converted content display
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        if (evt.detail.target.id === 'converted') {
          const data = JSON.parse(evt.detail.xhr.responseText);

          // Determine AI status indicator
          let aiIndicator = '';
          if (data.usedAI) {
            if (data.fallbackUsed) {
              aiIndicator = '<p style="color: #ff9800; font-size: 0.875em;">⚠ Fallback conversion used</p>';
            } else {
              aiIndicator = '<p style="color: #4caf50; font-size: 0.875em;">✓ AI-powered conversion</p>';
            }
          }

          evt.detail.target.innerHTML = \`
            <h3>Converted Content</h3>
            <pre>\${data.content}</pre>
            \${aiIndicator}
            \${data.cached ? '<p style="color: var(--text-secondary); font-size: 0.875em;">From cache</p>' : ''}
          \`;
        }

        // Auto-reload page after analysis refresh for updated metadata
        if (evt.detail.target.id === 'analysis-status' && evt.detail.xhr.status === 200) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      });
    </script>
  `;
  return layout(config.name, content);
}
```

**Key Changes:**
- Added analysis metadata display section for slash commands
- Added "Refresh Analysis" button with HTMX
- Added status display area for refresh feedback
- Auto-reload page after successful refresh to show updated metadata

### 2. Add Refresh Button to Converter Form

**File:** `src/views/slash-command-converter.ts`

Update `slashCommandConverterFormPartial` to add refresh button:

```typescript
export function slashCommandConverterFormPartial(config: Config): string {
  // Parse analysis metadata
  const hasArguments = config.has_arguments === 1 || config.has_arguments === true;
  const argumentHint = config.argument_hint;
  const agentReferences = config.agent_references ? JSON.parse(config.agent_references) : [];
  const skillReferences = config.skill_references ? JSON.parse(config.skill_references) : [];

  return `
    <div class="converter-form">
      <h3>${escapeHtml(config.name)}</h3>

      <!-- Analysis info box -->
      <div class="analysis-info">
        <p><strong>Analysis Results:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>Requires arguments: ${hasArguments ? 'Yes' : 'No'}</li>
          ${agentReferences.length > 0 ? `
            <li>Agent references detected: ${agentReferences.map((a: string) => escapeHtml(a)).join(', ')}</li>
          ` : ''}
          ${skillReferences.length > 0 ? `
            <li>Skill references detected: ${skillReferences.map((s: string) => escapeHtml(s)).join(', ')}</li>
          ` : ''}
          ${!hasArguments && agentReferences.length === 0 && skillReferences.length === 0 ? `
            <li>No special processing needed - simple command</li>
          ` : ''}
        </ul>

        <button
          class="btn btn-secondary"
          hx-post="/api/configs/${config.id}/refresh-analysis"
          hx-target="#refresh-status"
          hx-swap="innerHTML"
          style="margin-top: 10px;">
          🔄 Refresh Analysis
        </button>
        <span style="font-size: 0.875em; color: var(--text-secondary); margin-left: 10px;">
          (Re-detect arguments and references)
        </span>

        <div id="refresh-status" style="margin-top: 10px;"></div>
      </div>

      <form
        hx-post="/api/slash-commands/${config.id}/convert"
        hx-target="#result-section"
        hx-swap="innerHTML"
        hx-ext="json-enc">

        <!-- Conditionally show argument input if has_arguments=true -->
        ${hasArguments ? `
          <div class="form-group">
            <label for="userArguments">Arguments <span style="color: var(--danger);">*</span></label>
            <input
              type="text"
              id="userArguments"
              name="userArguments"
              required
              placeholder="${argumentHint ? escapeHtml(argumentHint) : 'Enter arguments here...'}"
            />
            ${argumentHint ? `
              <small class="help-text">
                Hint: ${escapeHtml(argumentHint)}
              </small>
            ` : `
              <small class="help-text">
                This command requires arguments to function properly
              </small>
            `}
          </div>
        ` : ''}

        <button type="submit" class="btn">Convert Command</button>
      </form>

      <!-- Result section -->
      <div id="result-section" style="margin-top: 2rem">
        <!-- Results will be inserted here via HTMX -->
      </div>

      <script>
        // Auto-reload form after analysis refresh to show updated metadata
        document.body.addEventListener('htmx:afterSwap', function(evt) {
          if (evt.detail.target.id === 'refresh-status' && evt.detail.xhr.status === 200) {
            setTimeout(() => {
              // Reload the form partial
              const configId = '${config.id}';
              htmx.ajax('GET', '/slash-commands/converter-form?configId=' + configId, {
                target: '#converter-form-section',
                swap: 'innerHTML'
              });
            }, 2000);
          }
        });
      </script>
    </div>
  `;
}
```

**Key Changes:**
- Added "Refresh Analysis" button inside analysis info box
- Added status display area for refresh feedback
- Auto-reload form after successful refresh to show updated metadata

### 3. Add Search to Converter Page

**File:** `src/views/slash-command-converter.ts`

Update `slashCommandConverterView` to add search functionality:

```typescript
// Main converter page - shows command selection with search
export function slashCommandConverterView(commands: Config[], searchQuery?: string): string {
  const content = `
    <h2>Slash Command Converter</h2>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
      Convert Claude Code slash commands for use in other AI agents (Claude Code Web, Codex, Gemini).
      Select a command below to analyze and convert it.
    </p>

    <div class="form-group">
      <label for="command-search">Search Commands</label>
      <input
        type="text"
        id="command-search"
        name="search"
        placeholder="Search by name..."
        value="${searchQuery || ''}"
        hx-get="/slash-commands/convert"
        hx-trigger="keyup changed delay:500ms"
        hx-target="#command-select-container"
        hx-swap="innerHTML"
        style="margin-bottom: 10px;"
      />
    </div>

    <div id="command-select-container">
      ${slashCommandConverterDropdownPartial(commands, searchQuery)}
    </div>

    <!-- Dynamic form section (loaded via HTMX when command selected) -->
    <div id="converter-form-section" style="margin-top: 30px;">
      <!-- Form will be loaded here based on selected command -->
    </div>
  `;

  return layout('Slash Command Converter', content);
}

// Partial for dropdown options (for HTMX updates)
export function slashCommandConverterDropdownPartial(commands: Config[], searchQuery?: string): string {
  return `
    <div class="form-group">
      <label for="command-select">Select Slash Command</label>
      <select
        id="command-select"
        name="configId"
        hx-get="/slash-commands/converter-form"
        hx-target="#converter-form-section"
        hx-swap="innerHTML"
        hx-trigger="change">
        <option value="">-- Select a command to convert --</option>
        ${commands.map(c => `
          <option value="${c.id}">${escapeHtml(c.name)}</option>
        `).join('')}
      </select>
      ${commands.length === 0 ? `
        <small class="help-text" style="color: var(--text-secondary);">
          ${searchQuery ? `No commands match "${escapeHtml(searchQuery)}"` : 'No slash commands available'}
        </small>
      ` : `
        <small class="help-text" style="color: var(--text-secondary);">
          ${commands.length} command${commands.length === 1 ? '' : 's'} available
        </small>
      `}
    </div>
  `;
}
```

**Key Changes:**
- Added search input field with HTMX
- Extracted dropdown into separate partial for HTMX updates
- Shows count of available commands
- Shows "no results" message when search returns nothing
- Search triggers with 500ms delay to avoid excessive requests

## Validation

### Backend Testing

**1. Test Refresh Analysis Endpoint:**

```bash
# Start dev server
npm run dev

# Get a slash command ID
CONFIG_ID=$(curl -s http://localhost:8787/api/configs | jq -r '.configs[] | select(.type=="slash_command") | .id' | head -1)

# Test refresh analysis
curl -X POST http://localhost:8787/api/configs/$CONFIG_ID/refresh-analysis | jq .

# Expected: { "success": true, "message": "Analysis refreshed", "analysis": {...} }
```

**2. Test Search Functionality:**

```bash
# Test with search parameter
curl -s "http://localhost:8787/slash-commands/convert?search=code" | grep -o "command(s) available"

# Expected: Should show filtered results
```

### Frontend Testing

**1. Test Refresh Button in Config Detail:**
- Navigate to any slash command config detail page: `http://localhost:8787/configs/:id`
- Verify analysis metadata is displayed
- Click "Refresh Analysis" button
- Verify success message appears
- Verify page reloads after 2 seconds with updated data

**2. Test Refresh Button in Converter:**
- Navigate to converter: `http://localhost:8787/slash-commands/convert`
- Select a slash command
- Verify analysis info box shows
- Click "Refresh Analysis" button
- Verify success message appears
- Verify form reloads after 2 seconds with updated data

**3. Test Search Functionality:**
- Navigate to converter: `http://localhost:8787/slash-commands/convert`
- Type in search box
- Verify dropdown updates after 500ms delay
- Verify command count updates
- Verify "no results" message shows when no matches
- Clear search and verify all commands return

### Manual Test Cases

**Test 1: Refresh Analysis on Config Detail Page**
1. Navigate to a slash command config: `/configs/:id`
2. Verify analysis metadata section is visible (only for slash commands)
3. Click "Refresh Analysis" button
4. Verify success message appears with analysis summary
5. Verify page reloads and shows updated analysis

**Test 2: Refresh Analysis on Converter Page**
1. Navigate to `/slash-commands/convert`
2. Select a slash command from dropdown
3. Verify analysis info box appears
4. Click "Refresh Analysis" button
5. Verify success message appears
6. Verify form reloads with updated analysis

**Test 3: Search Slash Commands**
1. Navigate to `/slash-commands/convert`
2. Type a search term (e.g., "code")
3. Verify dropdown updates with filtered commands
4. Verify command count updates
5. Type a non-matching term
6. Verify "no results" message appears
7. Clear search
8. Verify all commands are shown again

**Test 4: Error Handling**
1. Test refresh on non-existent config (should return 404)
2. Test refresh on non-slash-command config (should return 400)
3. Test with invalid API key (should show error message)

## Acceptance Criteria

- [ ] New endpoint POST `/api/configs/:id/refresh-analysis` works correctly
- [ ] Endpoint validates config type (slash_command only)
- [ ] Endpoint returns success message with analysis summary
- [ ] Config detail page shows analysis metadata for slash commands only
- [ ] Config detail page has "Refresh Analysis" button for slash commands
- [ ] Button triggers analysis refresh via HTMX
- [ ] Success message is displayed after refresh
- [ ] Page auto-reloads to show updated metadata
- [ ] Converter form has "Refresh Analysis" button in analysis info box
- [ ] Button triggers analysis refresh and form reload
- [ ] Converter page has search input field
- [ ] Search filters commands by name in real-time
- [ ] Search uses HTMX with 500ms delay
- [ ] Dropdown updates with filtered results
- [ ] Command count updates based on search
- [ ] "No results" message shows when search returns nothing
- [ ] All functionality works with HTMX (no page reloads except for metadata updates)
- [ ] Error handling works for invalid configs/analysis failures
