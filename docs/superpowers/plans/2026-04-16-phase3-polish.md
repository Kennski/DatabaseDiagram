# Phase 3: Polish & UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark/light theme toggle, relationship labels on diagram arrows, table search with auto-pan, collapsible columns (compact mode), and persistent annotations/notes.

**Architecture:** Theme uses CSS custom properties with a `[data-theme="light"]` override on `<html>`, toggled via nav bar button and persisted in localStorage. Diagram improvements (labels, search, compact mode) modify the visual page's rendering functions. Annotations use localStorage keyed by database name, with editing on the list view and read-only display on the diagram.

**Tech Stack:** Vanilla JavaScript (ES6), CSS custom properties, SVG text elements, localStorage

**Spec:** `docs/superpowers/specs/2026-04-16-phase3-polish-design.md`

---

### Task 1: Add CSS Custom Properties and Theme Toggle to `dynamic-list.html`

Start with one page to establish the pattern, then replicate to others.

**Files:**
- Modify: `public/dynamic-list.html`

- [ ] **Step 1: Add CSS custom properties at the top of `<style>`**

Add as the very first thing in the `<style>` block:

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

- [ ] **Step 2: Replace hardcoded colors with CSS variables**

Go through ALL CSS rules in the file and replace hardcoded color values with the corresponding variable. Key mappings:

- `#0f172a` → `var(--bg-primary)`
- `#1e293b` → `var(--bg-card)`
- `#334155` → `var(--border)` or `var(--bg-hover)`
- `#e2e8f0` → `var(--text-primary)`
- `#94a3b8` → `var(--text-secondary)`
- `#64748b` → `var(--text-muted)`
- `#6366f1` → `var(--accent)`
- `#818cf8` → `var(--accent-hover)`
- `#f8fafc` → `var(--text-primary)` (it's the brightest text)
- `#475569` → `var(--border)` (slightly different shade, close enough)

Leave semantic colors untouched (green for PK, blue for FK indicators, category colors, etc.).

- [ ] **Step 3: Add theme toggle button to nav bar**

Add in `.nav-right`, before the Export dropdown:

```html
<button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Toggle theme">🌙</button>
```

Add CSS:
```css
.theme-toggle { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 4px 10px; cursor: pointer; font-size: 16px; line-height: 1; }
.theme-toggle:hover { border-color: var(--accent); }
```

- [ ] **Step 4: Add theme toggle JS**

Add in the `<script>` block (before other IIFEs):

```javascript
function toggleTheme() {
    var html = document.documentElement;
    var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('dbdiagram_theme', next);
    document.getElementById('themeToggle').textContent = next === 'light' ? '☀️' : '🌙';
}
(function() {
    var theme = localStorage.getItem('dbdiagram_theme') || 'dark';
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        var btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = '☀️';
    }
})();
```

- [ ] **Step 5: Test both themes**

Load a schema, toggle the theme. Verify all elements look correct in both dark and light mode — nav bar, table cards, column rows, FK sections, search, filters, export dropdown, toasts.

- [ ] **Step 6: Commit**

```bash
git add public/dynamic-list.html
git commit -m "feat: add dark/light theme toggle to table list view"
```

---

### Task 2: Add Theme to All Other Pages

Apply the same CSS variables, light overrides, toggle button, and toggle JS to the remaining 5 pages.

**Files:**
- Modify: `public/index.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`
- Modify: `public/dynamic-diff.html`
- Modify: `public/dynamic-query.html`

- [ ] **Step 1: Add theme to `index.html`**

Same CSS variables + light overrides at top of `<style>`. Replace hardcoded colors with variables. Add theme toggle button in the minimal nav bar. Add `toggleTheme()` function and theme load IIFE.

The index page has a minimal nav (just app name) — add the toggle button next to the app name:

```html
<nav class="global-nav">
    <a href="/" class="app-name">DatabaseDiagram</a>
    <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Toggle theme">🌙</button>
</nav>
```

- [ ] **Step 2: Add theme to `dynamic-visual.html`**

Same pattern. The visual page has special canvas-related colors (canvas background, grid lines, table box rendering in JS) — replace the CSS colors with variables. For the JS-rendered canvas/SVG colors (which use hardcoded hex strings in JS code like `ctx.fillStyle = '#0f172a'`), read the CSS variable values at render time:

```javascript
var styles = getComputedStyle(document.documentElement);
var bgColor = styles.getPropertyValue('--bg-primary').trim();
var cardColor = styles.getPropertyValue('--bg-card').trim();
```

Use these variables instead of hardcoded colors in the canvas/SVG drawing functions.

- [ ] **Step 3: Add theme to `dynamic-analysis.html`**

Same CSS variables + toggle. The analysis page has score card colors (green, red, yellow for grade) — leave those as-is (semantic colors).

- [ ] **Step 4: Add theme to `dynamic-diff.html`**

Same pattern. The diff page has green/red/yellow tinted cards for added/removed/modified — leave those semantic colors as-is. Replace the neutral UI colors (nav, panels, inputs, borders) with variables.

- [ ] **Step 5: Add theme to `dynamic-query.html`**

Same pattern. Replace colors in picker sidebar, canvas, table cards, WHERE builder, SQL preview.

- [ ] **Step 6: Test all pages in both themes**

Toggle theme on one page, navigate to others — verify the theme persists (localStorage) and all pages look correct in both dark and light mode.

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/dynamic-visual.html public/dynamic-analysis.html public/dynamic-diff.html public/dynamic-query.html
git commit -m "feat: add dark/light theme toggle to all remaining pages"
```

---

### Task 3: Add Relationship Labels on Diagram Arrows

**Files:**
- Modify: `public/dynamic-visual.html`

- [ ] **Step 1: Locate the SVG arrow rendering code**

Read `public/dynamic-visual.html` and find where FK relationship arrows are drawn as SVG `<path>` elements. This is in the render function where `window._relationships` is iterated and bezier curves are created.

- [ ] **Step 2: Add label rendering at bezier midpoint**

For each arrow path, after creating the `<path>` element, calculate the midpoint of the cubic bezier curve at t=0.5:

```javascript
// Given control points: x1,y1 (start), cx1,cy1, cx2,cy2, x2,y2 (end)
// Midpoint at t=0.5:
var mx = 0.125*x1 + 0.375*cx1 + 0.375*cx2 + 0.125*x2;
var my = 0.125*y1 + 0.375*cy1 + 0.375*cy2 + 0.125*y2;
```

Add an SVG group with a background rect and text at the midpoint:

```javascript
// Label text is the FK column name(s)
var labelText = rel.from_columns.join(', ');
var labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
labelGroup.setAttribute('class', 'fk-label');

var bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
// Size will be set after measuring text — use approximate width
var textWidth = labelText.length * 6 + 8;
bgRect.setAttribute('x', mx - textWidth/2);
bgRect.setAttribute('y', my - 8);
bgRect.setAttribute('width', textWidth);
bgRect.setAttribute('height', 16);
bgRect.setAttribute('rx', 4);
bgRect.setAttribute('fill', styles.getPropertyValue('--bg-primary').trim());
bgRect.setAttribute('stroke', styles.getPropertyValue('--border').trim());
bgRect.setAttribute('stroke-width', '0.5');

var textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
textEl.setAttribute('x', mx);
textEl.setAttribute('y', my + 4);
textEl.setAttribute('text-anchor', 'middle');
textEl.setAttribute('font-size', '10');
textEl.setAttribute('fill', styles.getPropertyValue('--text-secondary').trim());
textEl.setAttribute('font-family', 'Segoe UI, sans-serif');
textEl.textContent = labelText;

labelGroup.appendChild(bgRect);
labelGroup.appendChild(textEl);
```

- [ ] **Step 3: Add zoom-based visibility**

Add CSS class to hide labels when zoomed out:

```css
.fk-label { transition: opacity 0.2s; }
.zoom-labels-hidden .fk-label { opacity: 0; pointer-events: none; }
```

In the zoom handler, toggle the class on the SVG container when zoom < 0.6:

```javascript
svgContainer.classList.toggle('zoom-labels-hidden', zoom < 0.6);
```

- [ ] **Step 4: Test**

Load a schema with FKs, verify labels appear on arrows, zoom out below 60% and verify they fade out.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-visual.html
git commit -m "feat: add FK column name labels on diagram relationship arrows"
```

---

### Task 4: Add Table Search with Auto-Pan on Visual Diagram

**Files:**
- Modify: `public/dynamic-visual.html`

- [ ] **Step 1: Add search HTML to the toolbar**

Add in the toolbar div (after the Reset Layout button, before any separator or end):

```html
<div class="search-wrapper" id="searchWrapper">
    <input type="text" class="table-search" id="diagramSearch" placeholder="Search tables..." autocomplete="off" oninput="onSearchInput(this.value)" onkeydown="onSearchKeydown(event)">
    <div class="search-dropdown" id="searchDropdown"></div>
</div>
```

- [ ] **Step 2: Add search CSS**

```css
.search-wrapper { position: relative; }
.table-search { padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 12px; width: 180px; outline: none; }
.table-search:focus { border-color: var(--accent); }
.search-dropdown { display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 500; margin-top: 4px; }
.search-dropdown.open { display: block; }
.search-dropdown div { padding: 6px 12px; cursor: pointer; font-size: 12px; color: var(--text-primary); }
.search-dropdown div:hover, .search-dropdown div.active { background: var(--bg-hover); }
@keyframes highlightPulse { 0% { box-shadow: 0 0 0 4px rgba(234,179,8,0.6); } 100% { box-shadow: 0 0 0 0 transparent; } }
.highlight-pulse { animation: highlightPulse 1.5s ease-out; }
```

- [ ] **Step 3: Add search JS**

```javascript
function onSearchInput(query) {
    var dropdown = document.getElementById('searchDropdown');
    if (!query || query.length < 1) { dropdown.classList.remove('open'); return; }
    var q = query.toLowerCase();
    var matches = Object.keys(window._schema || {}).filter(function(t) { return t.toLowerCase().includes(q); }).slice(0, 10);
    if (matches.length === 0) { dropdown.classList.remove('open'); return; }
    dropdown.innerHTML = matches.map(function(t) {
        return '<div onclick="panToTable(\'' + t.replace(/'/g, "\\'") + '\')">' + esc(t) + '</div>';
    }).join('');
    dropdown.classList.add('open');
}

function onSearchKeydown(e) {
    if (e.key === 'Enter') {
        var dropdown = document.getElementById('searchDropdown');
        var first = dropdown.querySelector('div');
        if (first) first.click();
    } else if (e.key === 'Escape') {
        document.getElementById('searchDropdown').classList.remove('open');
    }
}

function panToTable(tableName) {
    var pos = window._tablePos[tableName];
    if (!pos) return;
    // Center the table on screen
    var canvas = document.getElementById('canvas') || document.querySelector('.canvas-wrapper');
    var viewW = canvas.clientWidth;
    var viewH = canvas.clientHeight;
    var targetZoom = 1;
    var targetPanX = -(pos.x + pos.w / 2) * targetZoom + viewW / 2;
    var targetPanY = -(pos.y + pos.h / 2) * targetZoom + viewH / 2;

    // Apply with smooth transition
    zoom = targetZoom;
    panX = targetPanX;
    panY = targetPanY;
    updateTransform();
    document.getElementById('zoomLevel').textContent = Math.round(zoom * 100) + '%';

    // Highlight pulse
    var tableEl = document.getElementById('table-' + tableName) || document.querySelector('[data-table="' + tableName + '"]');
    if (tableEl) {
        tableEl.classList.remove('highlight-pulse');
        void tableEl.offsetWidth; // force reflow
        tableEl.classList.add('highlight-pulse');
        tableEl.addEventListener('animationend', function() { tableEl.classList.remove('highlight-pulse'); }, { once: true });
    }

    // Clear search
    document.getElementById('diagramSearch').value = '';
    document.getElementById('searchDropdown').classList.remove('open');
}

// Close dropdown on outside click
document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('searchWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('searchDropdown').classList.remove('open');
    }
});
```

Note: `updateTransform()` and the `zoom`/`panX`/`panY` variables already exist in the visual page — the search function uses them directly. Read the existing code to find the exact function name and variable names.

- [ ] **Step 4: Test**

Load a large schema, type a table name in search, verify dropdown appears, click a result, verify the diagram pans and zooms to center the table with a yellow pulse.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-visual.html
git commit -m "feat: add table search with auto-pan and highlight on visual diagram"
```

---

### Task 5: Add Collapsible Columns (Compact Mode) on Visual Diagram

**Files:**
- Modify: `public/dynamic-visual.html`

- [ ] **Step 1: Add compact toggle button to toolbar**

Add in the toolbar:

```html
<button class="btn" id="compactToggle" onclick="toggleCompact()">Compact</button>
```

- [ ] **Step 2: Add compact mode state and toggle**

```javascript
var compactMode = localStorage.getItem('dbdiagram_compact') === 'true';

function toggleCompact() {
    compactMode = !compactMode;
    localStorage.setItem('dbdiagram_compact', compactMode);
    document.getElementById('compactToggle').textContent = compactMode ? 'Detailed' : 'Compact';
    render(); // full re-render with new mode
}

// On page load, set button text
if (compactMode) {
    document.getElementById('compactToggle').textContent = 'Detailed';
}
```

- [ ] **Step 3: Modify table box rendering to support compact mode**

Find the table box rendering code in the render function (where columns are drawn for each table). Add a compact mode check:

```javascript
var columnsToShow;
if (compactMode) {
    // Show only PK and FK columns
    columnsToShow = table.columns.filter(function(col) {
        return table.primary_keys.includes(col.name) ||
               table.foreign_keys.some(function(fk) { return fk.columns.includes(col.name); });
    });
} else {
    columnsToShow = table.columns;
}
```

Use `columnsToShow` instead of `table.columns` when rendering column rows and calculating box height.

In compact mode, also add a summary line at the bottom of the box showing total column count: `"+ N more columns"` if there are hidden columns.

- [ ] **Step 4: Recalculate box heights and arrow positions**

After switching modes, boxes will be different heights. The render function should recalculate `window._tablePos` heights and update all arrow endpoints. If the existing render already does a full recalculation, this should work automatically.

- [ ] **Step 5: Test**

Load the 35-table stress test schema, click Compact — verify boxes shrink to show only key columns. Click Detailed — verify full columns return. Verify arrows still connect correctly in both modes.

- [ ] **Step 6: Commit**

```bash
git add public/dynamic-visual.html
git commit -m "feat: add compact/detailed column toggle on visual diagram"
```

---

### Task 6: Add Annotations/Notes — List View Editing

**Files:**
- Modify: `public/dynamic-list.html`

- [ ] **Step 1: Add notes helper functions**

Add in the `<script>` block:

```javascript
function getNotesKey() {
    var raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) return 'dbdiagram_notes_unknown';
    var data = JSON.parse(raw);
    return 'dbdiagram_notes_' + (data.database || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
}

function loadNotes() {
    try { return JSON.parse(localStorage.getItem(getNotesKey()) || '{}'); } catch(e) { return {}; }
}

function saveNote(key, value) {
    var notes = loadNotes();
    if (value && value.trim()) {
        notes[key] = value.trim();
    } else {
        delete notes[key];
    }
    localStorage.setItem(getNotesKey(), JSON.stringify(notes));
}
```

- [ ] **Step 2: Add note CSS**

```css
.note-icon { cursor: pointer; opacity: 0; transition: opacity 0.15s; font-size: 12px; margin-left: 6px; }
.table-header:hover .note-icon, .column-row:hover .note-icon, .note-icon.has-note { opacity: 1; }
.note-icon.has-note { opacity: 0.7; }
.note-display { background: var(--accent-bg); padding: 4px 10px; font-size: 12px; color: var(--text-secondary); border-radius: 4px; margin: 4px 14px; }
.note-input { width: calc(100% - 28px); margin: 4px 14px; padding: 6px 10px; background: var(--bg-primary); border: 1px solid var(--accent); border-radius: 6px; color: var(--text-primary); font-size: 12px; outline: none; resize: none; }
```

- [ ] **Step 3: Modify render function to show notes**

In the render function, when building each table card:

After the table header, check for a table-level note and display it:
```javascript
var notes = loadNotes();
var tableNote = notes[tableName];
if (tableNote) {
    html += '<div class="note-display">' + esc(tableNote) + '</div>';
}
```

Add a 📝 icon in the table header that toggles a note input:
```javascript
var hasTableNote = !!notes[tableName];
html += '<span class="note-icon ' + (hasTableNote ? 'has-note' : '') + '" onclick="event.stopPropagation();toggleNoteInput(\'' + esc(tableName) + '\')">📝</span>';
```

For each column row, add a 📝 icon:
```javascript
var colNoteKey = tableName + '.' + col.name;
var hasColNote = !!notes[colNoteKey];
html += '<span class="note-icon ' + (hasColNote ? 'has-note' : '') + '" onclick="event.stopPropagation();toggleNoteInput(\'' + esc(colNoteKey) + '\')">📝</span>';
```

If a column has a note, show it below the column row:
```javascript
if (notes[colNoteKey]) {
    html += '<div class="note-display" style="margin-left:30px">' + esc(notes[colNoteKey]) + '</div>';
}
```

- [ ] **Step 4: Add note input toggle function**

```javascript
function toggleNoteInput(key) {
    var existingInput = document.getElementById('note-input-' + key.replace(/\./g, '-'));
    if (existingInput) { existingInput.remove(); return; }

    var notes = loadNotes();
    var currentNote = notes[key] || '';

    var input = document.createElement('textarea');
    input.id = 'note-input-' + key.replace(/\./g, '-');
    input.className = 'note-input';
    input.rows = 2;
    input.value = currentNote;
    input.placeholder = 'Add a note...';
    input.onblur = function() {
        saveNote(key, this.value);
        render(); // re-render to show/hide note display
    };
    input.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.blur(); }
        if (e.key === 'Escape') { this.blur(); }
    };

    // Insert after the clicked element's parent
    var icon = event.target;
    var parent = icon.closest('.table-header') || icon.closest('.column-row');
    if (parent && parent.nextSibling) {
        parent.parentNode.insertBefore(input, parent.nextSibling);
    } else if (parent) {
        parent.parentNode.appendChild(input);
    }
    input.focus();
}
```

- [ ] **Step 5: Update Markdown export to include notes**

In `downloadMarkdown()`, after each table heading, add:
```javascript
var notes = loadNotes();
var tableNote = notes[t];
if (tableNote) md += '> ' + tableNote + '\n\n';
```

After each column row in the markdown table, check for column notes. Since markdown tables can't have inline notes, add them after the table:
```javascript
var colNotes = [];
for (var col of tbl.columns) {
    var cn = notes[t + '.' + col.name];
    if (cn) colNotes.push('- **' + col.name + '**: ' + cn);
}
if (colNotes.length > 0) {
    md += '\n**Notes:**\n' + colNotes.join('\n') + '\n';
}
```

- [ ] **Step 6: Test**

Load a schema, hover over a table header — verify 📝 icon appears. Click it, type a note, click away. Verify the note displays. Do the same for a column. Export Markdown — verify notes appear in the output.

- [ ] **Step 7: Commit**

```bash
git add public/dynamic-list.html
git commit -m "feat: add persistent annotations/notes on tables and columns in list view"
```

---

### Task 7: Add Note Badges on Visual Diagram

**Files:**
- Modify: `public/dynamic-visual.html`

- [ ] **Step 1: Add notes helper functions**

Same `getNotesKey()`, `loadNotes()` functions as in Task 6 (duplicated for the visual page):

```javascript
function getNotesKey() {
    var raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) return 'dbdiagram_notes_unknown';
    var data = JSON.parse(raw);
    return 'dbdiagram_notes_' + (data.database || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
}
function loadNotes() {
    try { return JSON.parse(localStorage.getItem(getNotesKey()) || '{}'); } catch(e) { return {}; }
}
```

- [ ] **Step 2: Add note badge in table box rendering**

Find where table box headers are drawn (either in canvas or DOM rendering). For tables that have notes, add a small 📝 badge next to the table name:

```javascript
var notes = loadNotes();
if (notes[tableName]) {
    // Add a 📝 text element or badge in the table header area
}
```

- [ ] **Step 3: Add tooltip on hover**

When hovering a table box that has a note badge, show the note text in a tooltip:

```css
.note-tooltip { position: absolute; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 12px; color: var(--text-primary); max-width: 300px; z-index: 600; pointer-events: none; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
```

On mouseover of the note badge, create and position the tooltip. On mouseout, remove it.

- [ ] **Step 4: Update visual page Markdown export to include notes**

Same pattern as Task 6 Step 5 — add notes to the `downloadMarkdown()` function.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-visual.html
git commit -m "feat: add note badges with tooltips on visual diagram"
```

---

### Task 8: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Phase 3 features to README**

Add a new section after "Query Builder":

```markdown
### Customization & UX
- **Dark/Light Theme** — Toggle between dark and light themes from the nav bar. Preference persists across sessions and pages
- **Relationship Labels** — FK column names displayed on diagram arrows for quick reference (auto-hidden when zoomed out)
- **Table Search** — Search box on the visual diagram toolbar with autocomplete. Selecting a result auto-pans and highlights the table
- **Compact Mode** — Toggle between detailed (all columns) and compact (PK/FK only) views on the visual diagram for cleaner large-schema visualization
- **Annotations** — Add persistent notes to tables and columns on the list view. Notes appear as badges on the visual diagram and are included in Markdown exports
```

Update Project Structure if needed.

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: add Phase 3 features to README"
git push
```
