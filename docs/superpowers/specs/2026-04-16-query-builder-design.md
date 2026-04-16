# Interactive SQL Query Builder — Design Spec

**Date:** 2026-04-16
**Scope:** Phase 2 Round 2 — dedicated query builder page

## Overview

A new dedicated page (`dynamic-query.html`) that provides a visual, interactive SQL query builder. Users pick tables from a sidebar, the builder auto-detects JOIN relationships via FK paths, and a live SQL preview updates in real-time. Generate-only — no query execution against the database.

---

## Page Layout

Three-zone layout:

```
┌─────────────────────────────────────────────────────┐
│  [Global Nav Bar]                                    │
├──────────────────────┬──────────────────────────────┤
│   TABLE PICKER       │   QUERY CANVAS               │
│   (left sidebar)     │   (table cards + JOINs +     │
│                      │    WHERE builder)             │
├──────────────────────┴──────────────────────────────┤
│   SQL PREVIEW (fixed bottom panel)                   │
└─────────────────────────────────────────────────────┘
```

---

## Component 1: Table Picker (Left Sidebar)

Searchable list of all tables from the loaded schema (`sessionStorage.getItem('dbdiagram_data')`).

### Display

- Search box at the top — filters tables by name (case-insensitive substring match)
- Tables grouped by auto-categorization (collapsible category headers with color indicators)
- Each table row shows: table name + column count badge (e.g., "users · 12 cols")
- Already-added tables get a checkmark icon and highlighted background (`#6366f120`)

### Behavior

- **Click a table** → adds it to the query canvas
- **Click an already-added table** → removes it from the canvas. If the table has JOIN dependencies (other tables joined through it), show a confirmation toast and remove dependent JOINs too.
- **First table added** → becomes the `FROM` table
- **Second+ table added** → auto-JOIN logic runs (see Component 3)

### Styling

- Width: 260px fixed
- Background: `#0f172a`
- Border-right: `1px solid #1e293b`
- Full height (fills between nav bar and SQL preview)
- Scrollable if tables overflow

---

## Component 2: Query Canvas (Main Area)

Shows selected tables as interactive cards with column checkboxes and JOIN indicators.

### Table Cards

Each selected table renders as a card on the canvas:

**Header:**
- Table name in bold
- Auto-generated alias: first letter for single-word names (`users` → `u`), initials for multi-word (`order_items` → `oi`). If alias conflicts with another table's alias, append a number (`u2`).
- JOIN type badge: `INNER`, `LEFT`, `RIGHT` — clickable to cycle between them. The `FROM` table shows `FROM` badge instead (not clickable).
- Remove button (×) to drop the table

**Body — Column checkboxes:**
- All columns listed with checkboxes, all checked by default when table is first added
- "All / None" toggle link at the top of the column list
- Each column shows: checkbox + icon (🔑 PK, 🔗 FK, · normal) + column name + type badge
- Unchecking a column removes it from the `SELECT` clause
- Checking/unchecking triggers SQL regeneration

**Card styling:**
- Background: `#1e293b`, border: `1px solid #334155`, border-radius: 10px
- Header background matches the table's category color (from auto-categorization)
- Cards arranged in a horizontal flex layout, wrapping to new rows when full
- Gap: 16px between cards

### JOIN Indicators

Between related table cards, display the JOIN condition:
- A styled connector element showing: `alias.column = alias.column` (e.g., `o.user_id = u.id`)
- Background: `#334155`, small pill shape, font-size: 11px
- Positioned between the two related cards
- Clicking the JOIN indicator opens a small popover to change the join columns (dropdown of available columns from both tables)

---

## Component 3: Auto-JOIN Logic

When a table is added to the canvas, the builder automatically finds the FK relationship path.

### Algorithm

1. **Direct FK check**: Look for a FK from the new table to any existing canvas table, or vice versa. If found, use it as the JOIN condition.

2. **Shortest path (BFS)**: If no direct FK exists, run BFS on the full FK graph (all tables in the schema, not just canvas tables) to find the shortest path from the new table to any existing canvas table.
   - The FK graph is bidirectional: `users.department_id → departments.id` creates edges in both directions.
   - BFS finds the shortest path in terms of number of intermediate tables.
   - All intermediate tables on the path are auto-added to the canvas with their JOINs.

3. **No path found**: If BFS finds no path at all, add the table as a `CROSS JOIN` with a warning badge: "⚠ No FK relationship found". The user can manually set join columns via the JOIN indicator popover.

### FK Graph Construction

Built once when the page loads from the schema data:

```javascript
// fkGraph[tableName] = [{ table: targetTable, fromCol: column, toCol: refColumn, direction: 'outgoing'|'incoming' }]
```

Each FK creates two edges (bidirectional) so BFS can traverse in both directions.

### Alias Generation

Auto-generate short aliases:
- Single word: first letter lowercase (`users` → `u`, `orders` → `o`)
- Multi-word (snake_case): initials (`order_items` → `oi`, `product_categories` → `pc`)
- Conflicts: append incrementing number (`u`, `u2`, `u3`)
- Stored in a `tableAliases` map, updated when tables are added/removed

---

## Component 4: WHERE Clause Builder

Displayed below the table cards on the canvas.

### UI

An "Add Condition" button that appends a new condition row. Each row contains:

| Element | Details |
|---------|---------|
| Column picker | Dropdown of `alias.column` for all selected tables and checked columns (e.g., `u.email`, `o.total`) |
| Operator picker | Dropdown: `=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`, `IN`, `IS NULL`, `IS NOT NULL` |
| Value input | Text field. Hidden for `IS NULL` / `IS NOT NULL`. Placeholder for `IN`: "value1, value2, ..." |
| Connector | AND/OR toggle between rows (default: AND). First row has no connector. |
| Remove button | × to delete the condition row |

### Behavior

- Flat conditions only (no nesting/grouping) — keeps it simple
- Adding/removing/editing conditions triggers SQL regeneration
- Column picker updates dynamically when tables or columns are added/removed from the canvas
- String values are auto-quoted in the SQL output; numeric values are not

### Styling

- Each row is a flex container with gap between elements
- Dropdowns and inputs use the same dark theme styling as the rest of the app
- AND/OR toggle: small pill button, click to switch

---

## Component 5: SQL Preview Panel

Fixed at the bottom of the page, always visible.

### Display

- **SQL text area**: read-only, syntax-highlighted, formatted with newlines and indentation
- **Copy button**: copies SQL to clipboard with toast
- **Download button**: downloads as `query-{date}.sql`
- **Dialect selector**: small dropdown — MySQL / PostgreSQL / SQL Server
  - Auto-detected from the loaded schema's version string (e.g., "MySQL 8.0" → MySQL, "PostgreSQL 15" → PostgreSQL)
  - User can override manually

### Syntax Highlighting

Simple CSS-based keyword coloring (no external library):
- Keywords (`SELECT`, `FROM`, `JOIN`, `INNER`, `LEFT`, `RIGHT`, `ON`, `WHERE`, `AND`, `OR`, `AS`): `color: #818cf8` (indigo)
- Table aliases: `color: #22c55e` (green)
- String values (single-quoted): `color: #fbbf24` (amber)
- Numbers: `color: #38bdf8` (sky blue)
- Everything else: `color: #e2e8f0` (light gray)

Implemented by wrapping the SQL text in `<span>` elements with appropriate CSS classes. Regenerated on every SQL change.

### SQL Generation Rules

```sql
SELECT
    u.id,
    u.email,
    u.username,
    o.id,
    o.total
FROM users u
INNER JOIN orders o ON o.user_id = u.id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE u.email LIKE '%@gmail.com'
    AND o.total > 100
```

- `SELECT`: fully qualified column names (`alias.column`), one per line, comma-separated
- `FROM`: first table with alias
- `JOIN` clauses: one per line, with ON condition
- `WHERE`: conditions with AND/OR, indented
- Identifier quoting based on dialect:
  - MySQL: `` `table`.`column` ``
  - PostgreSQL: `"table"."column"`
  - SQL Server: `[table].[column]`

### Panel Styling

- Height: ~150px, resizable via drag handle at the top edge
- Background: `#0f172a`
- Border-top: `1px solid #1e293b`
- SQL text in monospace font (`Cascadia Code`, `Consolas`, `monospace`)
- Overflow: scrollable if SQL is long

---

## Nav Integration

### Query Tab

Add a "Query" tab to the nav bar on all 5 pages (list, visual, analysis, diff, query).

- Dimmed by default (`opacity: 0.4`) on other pages
- Fully visible when a query has been built (detected by `sessionStorage.getItem('dbdiagram_query_state')`)
- Active on the query page itself

### CSS

```css
.nav-tab.query-tab { opacity: 0.4; }
.nav-tab.query-tab.has-query { opacity: 1; }
```

### State Persistence

The query state (selected tables, checked columns, JOIN types, WHERE conditions) is saved to `sessionStorage.setItem('dbdiagram_query_state', JSON.stringify(state))` on every change. This allows:
- Navigating away and back without losing the query
- The Query tab on other pages to detect that a query exists

---

## File Changes

| File | Changes |
|------|---------|
| `public/dynamic-query.html` | **New file** — full query builder page with table picker, canvas, WHERE builder, SQL preview |
| `public/dynamic-list.html` | Add Query tab to nav (dimmed) |
| `public/dynamic-visual.html` | Add Query tab to nav (dimmed) |
| `public/dynamic-analysis.html` | Add Query tab to nav (dimmed) |
| `public/dynamic-diff.html` | Add Query tab to nav (dimmed) |
| `public/index.html` | No changes |
| `server.js` | No changes |
| `README.md` | Add Query Builder to features list, update project structure |

No new npm dependencies. All client-side.
