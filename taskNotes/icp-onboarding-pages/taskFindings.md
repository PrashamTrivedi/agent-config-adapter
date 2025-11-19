# Purpose

Create static onboarding pages in the footer for each of the 3 ICPs (No-Code/Low-Code Builders, Multi-Tool Engineering Organizations, AI Pilot/Adoption Teams)

## Original Ask

Read @taskNotes/marketingNotes/ICPJTBD.md and use this to create static onboarding pages in the footer for each ICPs.

## Complexity and the reason behind it

**Complexity Score: 2/5**

Reasoning:
- Frontend-only task (no backend changes required)
- Straightforward content presentation from existing ICP analysis
- Layout structure already defined (Neural Lab design system in place)
- No dynamic functionality - just static informational pages
- Footer navigation component needs to be added to layout
- 3 similar pages with structured content from ICPJTBD.md

## Architectural changes required

None - this is purely additive frontend work within the existing view layer.

## Backend changes required

None required.

## Frontend changes required

### 1. Footer Component Creation
**Location**: `src/views/layout.ts`

- Add footer HTML structure before closing `</main>` tag
- Footer sections:
  - **Product Links**: Configs, Skills, Extensions, Marketplaces, MCP Server
  - **Resources Links**: Documentation (GitHub README), API Reference (placeholder), Community (placeholder)
  - **For Teams Links**: 3 ICP-specific onboarding pages
  - **Legal Links**: Privacy Policy (placeholder), Terms of Service (placeholder)
- Styled with Neural Lab design system:
  - Dark background (`var(--bg-secondary)`)
  - Cyan/violet accent borders
  - Responsive grid layout
  - Link hover effects with Neural Lab glow

### 2. ICP Onboarding Page Views
**Location**: Create new view file `src/views/onboarding.ts`

Export 3 page generation functions:
- `noCodeBuildersPage()` - ICP #1 page
- `multiToolOrgsPage()` - ICP #2 page
- `aiPilotTeamsPage()` - ICP #3 page

Each page structure:
- **Hero Section**: ICP name, profile description, pain points
- **Jobs To Be Done Section**: List of key JTBD with expandable descriptions
- **Why Us Section**: Explain why they can't solve this themselves
- **Platform Features**: Mapped features relevant to this ICP
- **CTA Section**: Email subscription form with return URL to subscription page
- **Revenue Model**: Brief mention of pricing/plan relevant to ICP

Content source: Direct copy from `taskNotes/marketingNotes/ICPJTBD.md`

Design system:
- Gradient hero sections (cyan/violet)
- Card-based layout for JTBD
- Icon usage from existing `icons.ts`
- Consistent with Neural Lab theme
- Mobile responsive

### 3. Route Handlers
**Location**: `src/index.ts` (main app router)

Add 3 new routes:
```typescript
app.get('/onboarding/no-code-builders', (c) => {
  return c.html(layout('For No-Code Builders', noCodeBuildersPage()));
});

app.get('/onboarding/multi-tool-orgs', (c) => {
  return c.html(layout('For Multi-Tool Organizations', multiToolOrgsPage()));
});

app.get('/onboarding/ai-pilot-teams', (c) => {
  return c.html(layout('For AI Pilot Teams', aiPilotTeamsPage()));
});
```

### 4. Content Extraction Plan

From ICPJTBD.md extract:
- **ICP #1 (lines 11-52)**: Profile, pain, JTBD (8 jobs), why they can't solve it themselves
- **ICP #2 (lines 55-103)**: Profile, pain, JTBD (10 jobs), why they can't solve it themselves
- **ICP #3 (lines 106-163)**: Profile, pain, JTBD (13 jobs), why they can't solve it themselves
- **Platform Features** (lines 193-228): Map to each ICP
- **Revenue Model** (lines 231-247): Extract relevant pricing for each ICP

## Acceptance Criteria

N/A (Complexity score < 3)

## Validation

### Manual Testing Steps

1. **Footer Visibility**
   - Navigate to any page (Home, Configs, Skills, etc.)
   - Scroll to bottom
   - Verify footer appears with 4 sections
   - Verify "For Teams" section has 3 ICP links

2. **ICP Page Navigation**
   - Click "No-Code/Low-Code Builders" footer link
   - Verify page loads at `/onboarding/no-code-builders`
   - Verify hero section displays ICP #1 profile
   - Verify JTBD section lists 8 jobs
   - Verify CTA section has email subscription form
   - Repeat for other 2 ICP pages

3. **Responsive Design**
   - Test on mobile viewport (375px width)
   - Verify footer stacks vertically
   - Verify ICP pages are readable on mobile
   - Test on tablet viewport (768px width)
   - Test on desktop viewport (1400px width)

4. **Cross-Page Footer Consistency**
   - Navigate between Home, Configs, Skills, ICP pages
   - Verify footer appears on all pages
   - Verify footer styling is consistent

5. **Link Functionality**
   - Test all footer links (product, resources, teams, legal)
   - Verify working links navigate correctly
   - Verify placeholder links show "coming soon" behavior

### Commands to Verify

```bash
# Start dev server
npm run dev

# Test routes manually
curl http://localhost:9090/onboarding/no-code-builders
curl http://localhost:9090/onboarding/multi-tool-orgs
curl http://localhost:9090/onboarding/ai-pilot-teams

# Verify HTML structure
curl http://localhost:9090/onboarding/no-code-builders | grep -o "<footer" | wc -l  # Should output 1
curl http://localhost:9090/ | grep -o "<footer" | wc -l  # Should output 1 (footer on home page)
```

### Expected Outcomes

- ✅ Footer visible on all pages
- ✅ 3 ICP onboarding pages accessible via footer links
- ✅ Each ICP page displays relevant content from ICPJTBD.md
- ✅ Neural Lab design system applied consistently
- ✅ Mobile responsive layout works correctly
- ✅ Email subscription CTA prominent on each ICP page
- ✅ No console errors in browser
- ✅ No layout shifts or visual glitches
