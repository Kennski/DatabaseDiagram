# Phase 3: Polish & UX — Design Spec

**Date:** 2026-04-16
**Scope:** 5 independent features shipped together

## Overview

1. **Dark/Light Theme Toggle** — CSS custom properties + toggle in nav bar, persisted in localStorage
2. **Relationship Labels on Diagram Arrows** — FK column names displayed on SVG arrow midpoints
3. **Table Search with Auto-Pan** — Search box in visual diagram toolbar with autocomplete and smooth pan/zoom
4. **Collapsible Columns on Diagram** — Compact mode showing only PK/FK columns for reduced clutter
5. **Annotations / Notes** — Persistent notes on tables and columns, editable on list view, visible on diagram

---

## Feature 1: Dark/Light Theme Toggle

### Mechanism

All hardcoded color values across all pages are replaced with CSS custom properties. A toggle button in the nav bar switches between dark and light themes.

### CSS Custom Properties

Defined at `:root` level in each page:

```css
:root {
    --bg-primary: #0f172a;
    --bg-card: #1e293b;
    --bg-hover: #334155;
    --border: #334155;
    --border-light: #1e293b;
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --accent: #6366f1;
    --accent-hover: #818cf8;
    --accent-bg: rgba(99,102,241,0.12);
}

[data-theme="light"] {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-hover: #f1f5f9;
    --border: #e2e8f0;
    --border-light: #f1f5f9;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    --accent: #4f46e5;
    --accent-hover: #6366f1;
    --accent-bg: rgba(79,70,229,0.08);
}
```

### Toggle Button

In the global nav bar's `.nav-right`, before the Export dropdown:

```html
<button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Toggle theme">🌙</button>
```

CSS: `.theme-toggle { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 4px 10px; cursor: pointer; font-size: 16px; }`

### Toggle Logic

```javascript
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('dbdiagram_theme', next);
    document.getElementById('themeToggle').textContent = next === 'light' ? '☀️' : '🌙';
}

// On page load
(function() {
    const theme = localStorage.getItem('dbdiagram_theme') || 'dark';
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        var btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = '☀️';
    }
})();
```

### Scope

All 6 pages (index, list, visual, analysis, diff, query). Each page gets:
1. CSS variables at `:root` with light theme overrides
2. All hardcoded colors replaced with `var(--name)`
3. Theme toggle button in nav bar
4. Theme load IIFE

The index page has a minimal nav (no Export dropdown) — the toggle goes directly in the nav.

---

## Feature 2: Relationship Labels on Diagram Arrows

### Location

`public/dynamic-visual.html` — the SVG arrow rendering.

### What Shows

Each FK arrow gets a text label at the midpoint of the bezier curve showing the FK column name(s).

- Single column FK: `user_id`
- Composite FK: `post_id, tag_id`

### Rendering

When building SVG path elements for FK arrows, add a `<text>` element positioned at the bezier midpoint:

1. Calculate the midpoint of the cubic bezier curve (at t=0.5)
2. Add a small `<rect>` background behind the text (pill shape with `var(--bg-primary)` fill) so the label doesn't overlap the arrow line
3. Add a `<text>` element with the column name(s)

### Styling

- Font size: 10px
- Fill: `var(--text-secondary)`
- Background rect: `var(--bg-primary)` with 2px padding
- Labels hidden when zoom level < 0.6 (add a CSS class `.zoom-labels-hidden` that sets `display:none` on all label elements, toggled by the zoom handler)

### No New Controls

Labels are always visible above 60% zoom. No toggle needed.

---

## Feature 3: Table Search with Auto-Pan

### Location

`public/dynamic-visual.html` — the toolbar (zoom controls bar).

### UI

A search input added to the toolbar:

```html
<div class="search-wrapper">
    <input type="text" class="table-search" id="diagramSearch" placeholder="Search tables..." autocomplete="off">
    <div class="search-dropdown" id="searchDropdown"></div>
</div>
```

### Behavior

1. **As user types:** Filter `Object.keys(schema)` by case-insensitive substring match. Show up to 10 results in a dropdown below the input.
2. **Click a result or press Enter on first match:** 
   - Read the table's position from `window._tablePos[tableName]`
   - Calculate the pan/zoom needed to center the table on screen at 100% zoom
   - Apply with a CSS transition (~300ms smooth animation)
   - Add a `.highlight-pulse` class to the table DOM element (yellow glow that fades over 1.5s)
   - Clear the search input and close the dropdown

### Styling

```css
.search-wrapper { position: relative; }
.table-search { padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 12px; width: 180px; outline: none; }
.table-search:focus { border-color: var(--accent); }
.search-dropdown { display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 500; margin-top: 4px; }
.search-dropdown.open { display: block; }
.search-dropdown div { padding: 6px 12px; cursor: pointer; font-size: 12px; color: var(--text-primary); }
.search-dropdown div:hover { background: var(--bg-hover); }
@keyframes highlightPulse { 0% { box-shadow: 0 0 0 4px rgba(234,179,8,0.6); } 100% { box-shadow: 0 0 0 0 transparent; } }
.highlight-pulse { animation: highlightPulse 1.5s ease-out; }
```

---

## Feature 4: Collapsible Columns on Visual Diagram

### Location

`public/dynamic-visual.html` — toolbar + table box rendering.

### Toggle Button

Added to the toolbar:

```html
<button class="btn" id="compactToggle" onclick="toggleCompact()">Compact</button>
```

Text toggles between "Compact" and "Detailed" based on current mode.

### Compact Mode

When `compactMode = true`:
- Table boxes show only: table name header + column count + PK columns + FK columns
- Non-key columns are hidden
- Box height shrinks to fit

When `compactMode = false` (default):
- Full column list with icons, names, types (current behavior)

### Implementation

- Global `compactMode` boolean
- `toggleCompact()` flips the boolean, saves to `localStorage.setItem('dbdiagram_compact', ...)`, and re-renders all table boxes
- The table rendering function checks `compactMode` and filters columns accordingly
- After re-rendering, arrow positions are recalculated to match new box sizes
- On page load, read `localStorage.getItem('dbdiagram_compact')` to restore preference

---

## Feature 5: Annotations / Notes

### Storage

`localStorage` keyed by database name:

```javascript
// Key: 'dbdiagram_notes_' + dbName
// Value: JSON
{
    "users": "Main user table — synced from Auth0",
    "users.legacy_id": "Deprecated — use id instead",
    "orders": "Partitioned by month since 2024"
}
```

Table-level notes use the table name as key. Column-level notes use `tableName.columnName`.

### List View — Full Editing

On `dynamic-list.html`:

- Each table card header gets a 📝 icon (visible on hover, always visible if note exists)
- Clicking the icon opens an inline textarea below the header for the table-level note
- Each column row gets a small 📝 icon (visible on hover, always visible if note exists)
- Clicking opens an inline input for the column-level note
- Notes auto-save to localStorage on blur/change
- Notes display as a subtle colored bar: `background: var(--accent-bg); padding: 4px 8px; font-size: 12px; color: var(--text-secondary); border-radius: 4px; margin: 4px 0;`

### Visual Diagram — Read-Only Display

On `dynamic-visual.html`:

- Tables with notes show a 📝 badge next to the table name in the box header
- Hovering the badge shows a tooltip with the note text
- No editing on the diagram — keeps the interaction model simple (edit on list view, view on diagram)

### Export Integration

When generating Markdown export (`downloadMarkdown()`):
- If a table has a note, add it as a blockquote after the table heading: `> Note: {note text}`
- If a column has a note, add it as a comment after the column row: `<!-- {note text} -->` or as a footnote

### Files Changed

- `public/dynamic-list.html` — note editing UI on table cards and column rows
- `public/dynamic-visual.html` — note badge display with tooltip
- `public/dynamic-list.html` — update `downloadMarkdown()` to include notes
- `public/dynamic-visual.html` — update `downloadMarkdown()` to include notes
- `public/dynamic-analysis.html` — update `downloadMarkdown()` to include notes

---

## Theme Migration Scope

Replacing hardcoded colors with CSS variables touches every page. The scope per page:

| Page | Hardcoded colors to replace |
|------|---------------------------|
| `index.html` | Body bg, form inputs, cards, buttons, guide boxes, upload area |
| `dynamic-list.html` | Nav bar, table cards, column rows, FK section, search, filters, export dropdown |
| `dynamic-visual.html` | Nav bar, toolbar, canvas bg, table boxes, SVG arrows, minimap, export dropdown |
| `dynamic-analysis.html` | Nav bar, score cards, finding cards, severity colors, export dropdown |
| `dynamic-diff.html` | Nav bar, source panels, diff cards (preserve green/red/yellow tints), export dropdown |
| `dynamic-query.html` | Nav bar, picker sidebar, table cards, WHERE builder, SQL preview |

Note: Severity/diff colors (green for added, red for removed, yellow for modified) should NOT change between themes — they're semantic colors that work on both dark and light backgrounds.

---

## File Changes Summary

| File | Changes |
|------|---------|
| All 6 pages | CSS variables, theme toggle, light theme overrides |
| `dynamic-visual.html` | Relationship labels, table search, compact mode, note badge display |
| `dynamic-list.html` | Note editing UI, markdown export with notes |
| `dynamic-visual.html` | Markdown export with notes |
| `dynamic-analysis.html` | Markdown export with notes |
| `server.js` | No changes |
| `README.md` | Add Phase 3 features |
