# Server-Rendered Views

HTMX-powered HTML templates with Neural Lab design system.

## Design System

**Neural Lab Theme**: Dark theme with vibrant accents
- Primary: Purple/violet gradients
- Background: Dark navy/black
- Text: White/light gray
- Accents: Neon purple, cyan, pink

## View Structure

- **layout.ts**: Master page layout, CSS variables, navigation
- **icons.ts**: Reusable SVG icon components
- **configs.ts**: Config list, detail, create, edit forms
- **skills.ts**: Multi-file skill editor with tabs
- **extensions.ts**: Extension bundling interface
- **marketplaces.ts**: Marketplace management
- **slash-command-converter.ts**: Converter frontend UI
- **plugin-browser.ts**: File tree navigation

## Template Patterns

### Layout Wrapper
```typescript
import { layout } from './layout'
return layout('Page Title', content)
```

### Icon Usage
```typescript
import { sparklesIcon, refreshIcon } from './icons'
const html = `<button>${sparklesIcon()} Convert</button>`
```

### HTMX Patterns
- Use `hx-get`, `hx-post` for dynamic updates
- `hx-target` for partial updates
- `hx-swap` for content replacement

## Gist-Like Editor

Skills use tab-based editing:
- SKILL.md tab (required)
- Companion file tabs
- Add/remove file buttons
- ZIP upload/download
