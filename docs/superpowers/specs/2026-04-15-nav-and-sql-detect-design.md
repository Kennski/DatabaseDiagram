# Global Navigation & SQL Auto-Detection — Design Spec

**Date:** 2026-04-15
**Scope:** Two independent improvements shipped together

## Overview

1. **Global Navigation Bar** — Replace the per-page ad-hoc nav links with a unified, persistent top bar across all views. Provides consistent styling, active-page indicators, database context, and a centralized Export/Share dropdown.

2. **SQL Dialect Auto-Detection** — Automatically detect MySQL/PostgreSQL/SQL Server dialect from pasted or uploaded SQL, updating the selector while allowing manual override.

---

## Feature 1: Global Navigation Bar

### Structure

A persistent top bar with 3 zones on the 3 view pages (`dynamic-list.html`, `dynamic-visual.html`, `dynamic-analysis.html`):

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DatabaseDiagram  [mydb · MySQL 8.0]   Table List | Visual | Analysis   [Export/Share ▼] [← New]  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Left zone:**
- App name "DatabaseDiagram" — links to `index.html`
- Database context badge — pill showing `{database} · {version}` read from sessionStorage (`dbdiagram_data`). Hidden if no schema is loaded.

**Center zone:**
- Three tab links: **Table List** (`/dynamic-list.html`), **Visual Diagram** (`/dynamic-visual.html`), **Analysis** (`/dynamic-analysis.html`)
- Active page indicated by bright text (`#e2e8f0`) + indigo bottom accent line (`#6366f1`)
- Inactive tabs use muted text (`#94a3b8`)
- If no schema is loaded, tabs link to `/` instead

**Right zone:**
- Export/Share dropdown (already implemented — relocated from its current position on each page)
- "New Connection" button — ghost/outline style, secondary emphasis

**On `index.html`:** Simplified version — app name only, no tabs or export (no schema context yet).

### Styling

- **Background:** `#0f172a` with bottom border `1px solid #1e293b`
- **Position:** `position: sticky; top: 0; z-index: 100`
- **Height:** ~50px
- **Layout:** Flexbox — `justify-content: space-between; align-items: center`
- **Tab links:** No background, text-only. Active state: bright text + 2px bottom border in `#6366f1`
- **Database badge:** `background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 4px 12px; font-size: 12px; color: #94a3b8`
- **New Connection button:** `border: 1px solid #334155; background: transparent; color: #94a3b8; border-radius: 8px`

### Implementation

- Each page gets identical nav bar HTML/CSS, differing only in which tab has the `active` class
- The existing per-page nav elements (`.nav-btn` on list/analysis, `.nav-link` on visual) are removed and replaced
- The existing Export/Share dropdown (CSS, HTML, JS including click-outside handler) moves into the nav bar's right zone — no functional changes, just repositioned
- Database name and version are read from `JSON.parse(sessionStorage.getItem('dbdiagram_data'))` on page load
- `index.html` gets a minimal version: just the app name, no tabs, no export

### What Gets Removed

- `dynamic-list.html`: The 3 `.nav-btn` links and their CSS
- `dynamic-visual.html`: The 3 `.nav-link` links and their CSS
- `dynamic-analysis.html`: The 3 `.nav-btn` links and their CSS (`.nav-bar` container)
- The Export/Share dropdown stays but moves into the new nav bar
- `dynamic-visual.html`: The standalone PNG/SVG download buttons (outside the dropdown) are removed — those options are already in the Export/Share dropdown

---

## Feature 2: SQL Dialect Auto-Detection

### Detection Function

`detectSQLDialect(sql)` — client-side function on `index.html` that scans SQL text for dialect-specific signatures.

**Scoring system:** Count occurrences of signals per dialect. Highest score wins if it has 2+ matches (confidence threshold).

| Signal | Dialect | Weight |
|--------|---------|--------|
| Backtick identifiers `` `name` `` | MySQL | 1 per occurrence |
| `ENGINE=` or `ENGINE =` | MySQL | 2 |
| `AUTO_INCREMENT` | MySQL | 2 |
| `UNSIGNED` | MySQL | 1 |
| `serial` or `bigserial` (as column type) | PostgreSQL | 2 |
| `::` type cast operator | PostgreSQL | 1 per occurrence |
| `WITHOUT OIDS` | PostgreSQL | 2 |
| `BOOLEAN` (as column type, not MySQL alias) | PostgreSQL | 1 |
| `[bracket]` identifiers | SQL Server | 1 per occurrence |
| `IDENTITY(` or `IDENTITY (` | SQL Server | 2 |
| `GO` (as standalone statement) | SQL Server | 2 |
| `NVARCHAR` or `NCHAR` | SQL Server | 1 |
| `CLUSTERED` | SQL Server | 1 |

**Returns:** `'mysql'`, `'postgres'`, `'mssql'`, or `'auto'` (inconclusive).

### When It Runs

- **SQL paste textarea:** On `input` event, debounced at 300ms. Only runs if text length > 20 characters (skip trivial input).
- **File drop/upload:** Immediately after `FileReader.onload` completes.

### UI Behavior

- On detection, auto-set the dialect `<select>` dropdown to the detected value.
- Show a subtle "(auto-detected)" label next to the selector. Use `color: #6366f1; font-size: 12px`, fade in with CSS animation.
- If the user manually changes the selector after auto-detection, the "(auto-detected)" label disappears (override respected). Set a flag `userOverrodeDialect = true` that prevents further auto-updates.
- If detection returns `'auto'` (inconclusive), the selector stays on its current value and no label appears.
- On new paste/upload that replaces the content, reset `userOverrodeDialect = false` and re-detect.

### No Server Changes

The existing `parseSqlDump()` in `server.js` already handles all dialects in a single parser. The detection is purely a UI convenience — the server doesn't need the dialect hint.

---

## File Changes

| File | Changes |
|------|---------|
| `public/index.html` | Add minimal nav bar (app name only); add `detectSQLDialect()` function; wire to paste/upload events; add auto-detected label UI |
| `public/dynamic-list.html` | Replace per-page nav with global nav bar; relocate Export/Share dropdown into nav; add database context badge |
| `public/dynamic-visual.html` | Replace per-page nav with global nav bar; relocate Export/Share dropdown into nav; add database context badge |
| `public/dynamic-analysis.html` | Replace per-page nav with global nav bar; relocate Export/Share dropdown into nav; add database context badge |

No changes to `server.js`.
