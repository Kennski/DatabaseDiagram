# Interactive SQL Query Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated query builder page where users visually select tables and columns, with auto-JOIN detection via FK paths, a WHERE clause builder, and a live syntax-highlighted SQL preview with dialect-aware quoting.

**Architecture:** A new `public/dynamic-query.html` page with three zones: table picker sidebar (left), query canvas with table cards and WHERE builder (center), and SQL preview panel (bottom). All logic is client-side, reading the schema from sessionStorage. The auto-JOIN uses BFS on a bidirectional FK graph. A Query tab is added to the nav bar on all existing pages.

**Tech Stack:** Vanilla JavaScript (ES6), CSS3 flexbox, HTML5

**Spec:** `docs/superpowers/specs/2026-04-16-query-builder-design.md`

---

### Task 1: Add Query Tab to Nav Bar on All Existing Pages

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`
- Modify: `public/dynamic-diff.html`

- [ ] **Step 1: Add Query tab CSS to all 4 pages**

Add after the existing `.nav-tab.diff-tab.has-diff` CSS rule in each file:

```css
.nav-tab.query-tab { opacity: 0.4; }
.nav-tab.query-tab.has-query { opacity: 1; }
```

- [ ] **Step 2: Add Query tab HTML to `.nav-center` in all 4 pages**

In each file, find the `.nav-center` section. Add after the Diff tab:

```html
<a href="/dynamic-query.html" class="nav-tab query-tab" id="queryTab">Query</a>
```

- [ ] **Step 3: Add Query tab visibility JS to all 4 pages**

Add an IIFE after the existing diff tab visibility check:

```javascript
(function() {
    var queryTab = document.getElementById('queryTab');
    if (queryTab && sessionStorage.getItem('dbdiagram_query_state')) {
        queryTab.classList.add('has-query');
    }
})();
```

- [ ] **Step 4: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html public/dynamic-diff.html
git commit -m "feat: add dimmed Query tab to nav bar on all pages"
```

---

### Task 2: Create Query Builder Page — Shell and Table Picker

Create the new page with nav bar, toast system, and the table picker sidebar.

**Files:**
- Create: `public/dynamic-query.html`

- [ ] **Step 1: Create the page with full HTML structure**

Create `public/dynamic-query.html` as a complete self-contained HTML page with:

**CSS (in `<style>`):** Include all of the following:
- Global nav bar CSS (`.global-nav`, `.nav-left`, `.app-name`, `.db-badge`, `.nav-center`, `.nav-tab`, `.nav-right`, `.nav-new-btn` — copy from list page)
- Diff/Query tab dimming CSS (`.diff-tab`, `.query-tab` opacity rules)
- Export dropdown CSS (`.export-wrapper`, `.export-btn`, `.export-menu` etc.)
- Toast CSS (`.toast-container`, `.toast`, keyframes)
- Table picker CSS:
```css
.query-layout { display: flex; height: calc(100vh - 50px - 180px); }
.table-picker { width: 260px; min-width: 260px; background: #0f172a; border-right: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden; }
.picker-search { padding: 12px; border-bottom: 1px solid #1e293b; }
.picker-search input { width: 100%; padding: 8px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; font-size: 13px; outline: none; }
.picker-search input:focus { border-color: #6366f1; }
.picker-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.picker-category { padding: 6px 12px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; }
.picker-table { padding: 8px 16px; font-size: 13px; color: #e2e8f0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.1s; }
.picker-table:hover { background: #1e293b; }
.picker-table.selected { background: rgba(99,102,241,0.12); }
.picker-table .col-count { font-size: 11px; color: #64748b; }
.picker-table .check { color: #6366f1; margin-right: 8px; }
```
- Query canvas CSS:
```css
.query-canvas { flex: 1; overflow: auto; padding: 20px; background: #0f172a; }
.canvas-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #475569; font-size: 15px; }
.table-cards { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.query-card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; min-width: 220px; max-width: 300px; overflow: hidden; }
.query-card-header { padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13px; color: #f8fafc; }
.query-card-header .alias { color: #818cf8; font-weight: 400; font-size: 12px; margin-left: 6px; }
.query-card-header .join-badge { font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600; cursor: pointer; }
.query-card-header .join-badge.from { background: #6366f120; color: #818cf8; }
.query-card-header .join-badge.inner { background: #22c55e20; color: #22c55e; }
.query-card-header .join-badge.left { background: #eab30820; color: #eab308; }
.query-card-header .join-badge.right { background: #38bdf820; color: #38bdf8; }
.query-card-header .remove-btn { background: none; border: none; color: #64748b; cursor: pointer; font-size: 16px; padding: 0 4px; }
.query-card-header .remove-btn:hover { color: #ef4444; }
.query-card-body { padding: 8px 0; max-height: 240px; overflow-y: auto; }
.query-card-body .toggle-all { padding: 4px 14px; font-size: 11px; color: #6366f1; cursor: pointer; }
.query-col { display: flex; align-items: center; gap: 6px; padding: 3px 14px; font-size: 12px; }
.query-col input[type="checkbox"] { accent-color: #6366f1; }
.query-col .col-icon { width: 14px; text-align: center; font-size: 10px; }
.query-col .col-name { color: #e2e8f0; }
.query-col .col-type { color: #818cf8; font-family: monospace; font-size: 11px; margin-left: auto; }
.join-indicator { display: inline-flex; align-items: center; background: #334155; color: #94a3b8; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-family: monospace; margin: 4px 0; }
```
- WHERE builder CSS:
```css
.where-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e293b; }
.where-title { font-size: 13px; color: #94a3b8; font-weight: 600; margin-bottom: 8px; }
.where-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.where-row select, .where-row input { padding: 6px 10px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #e2e8f0; font-size: 12px; }
.where-row select { min-width: 140px; }
.where-row input { min-width: 120px; flex: 1; }
.where-connector { font-size: 11px; font-weight: 600; color: #818cf8; padding: 4px 10px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; cursor: pointer; min-width: 40px; text-align: center; }
.where-remove { background: none; border: none; color: #64748b; cursor: pointer; font-size: 14px; }
.where-remove:hover { color: #ef4444; }
.add-condition-btn { padding: 6px 14px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #94a3b8; font-size: 12px; cursor: pointer; }
.add-condition-btn:hover { border-color: #6366f1; color: #e2e8f0; }
```
- SQL preview CSS:
```css
.sql-preview { position: fixed; bottom: 0; left: 0; right: 0; height: 180px; background: #0f172a; border-top: 1px solid #1e293b; z-index: 50; display: flex; flex-direction: column; }
.sql-preview-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid #1e293b; }
.sql-preview-header .label { font-size: 12px; font-weight: 600; color: #94a3b8; }
.sql-preview-header .actions { display: flex; gap: 8px; align-items: center; }
.sql-preview-header .actions button { padding: 4px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #94a3b8; font-size: 12px; cursor: pointer; }
.sql-preview-header .actions button:hover { border-color: #6366f1; color: #e2e8f0; }
.sql-preview-header .actions select { padding: 4px 8px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #94a3b8; font-size: 12px; }
.sql-preview-body { flex: 1; overflow: auto; padding: 12px 16px; }
.sql-preview-body pre { margin: 0; font-family: 'Cascadia Code', Consolas, monospace; font-size: 13px; line-height: 1.5; color: #e2e8f0; white-space: pre-wrap; }
.sql-kw { color: #818cf8; } .sql-alias { color: #22c55e; } .sql-str { color: #fbbf24; } .sql-num { color: #38bdf8; }
```

**HTML (in `<body>`):**
- Toast container
- Global nav bar with Query tab active (same structure as other pages, with 5 tabs: Table List, Visual Diagram, Analysis, Diff, Query)
- Export dropdown with: Copy SQL, Download SQL buttons (not the schema exports — this page exports queries)
- Three-zone layout: `.table-picker` (left), `.query-canvas` (center), `.sql-preview` (bottom)
- Empty state message in canvas: "Select a table from the left panel to start building your query"

**JS (in `<script>`):**
- `showToast()` function
- Database badge IIFE
- Diff tab visibility IIFE
- Export dropdown click-outside handler
- `autoCategorize()` function (copy from list page — needed for table picker grouping)
- Table picker initialization: read schema from sessionStorage, categorize tables, render the picker list with search

```javascript
// State
let schema = {};
let dbName = '';
let dbVersion = '';
let selectedTables = []; // { name, alias, joinType, joinFrom, joinFromCol, joinToCol }
let columnSelections = {}; // { tableName: { colName: true/false } }
let whereConditions = []; // { column, operator, value, connector }
let tableAliases = {};
let fkGraph = {};
let dialect = 'mysql';

function init() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) return;
    const data = JSON.parse(raw);
    schema = data.schema;
    dbName = data.database || 'Database';
    dbVersion = data.version || '';
    // Auto-detect dialect
    if (/postgres/i.test(dbVersion)) dialect = 'postgres';
    else if (/sql\s*server|microsoft/i.test(dbVersion)) dialect = 'mssql';
    else dialect = 'mysql';
    document.getElementById('dialectSelect').value = dialect;
    buildFKGraph();
    renderPicker();
}

function buildFKGraph() {
    fkGraph = {};
    for (const [table, tbl] of Object.entries(schema)) {
        if (!fkGraph[table]) fkGraph[table] = [];
        for (const fk of tbl.foreign_keys) {
            fkGraph[table].push({ table: fk.ref_table, fromCol: fk.columns[0], toCol: fk.ref_columns[0], direction: 'outgoing' });
            if (!fkGraph[fk.ref_table]) fkGraph[fk.ref_table] = [];
            fkGraph[fk.ref_table].push({ table: table, fromCol: fk.ref_columns[0], toCol: fk.columns[0], direction: 'incoming' });
        }
    }
}

function renderPicker() {
    const { categories, categoryColors } = autoCategorize(schema);
    const search = (document.getElementById('pickerSearch')?.value || '').toLowerCase();
    let html = '';
    for (const [cat, tables] of Object.entries(categories)) {
        const filtered = tables.filter(t => !search || t.toLowerCase().includes(search));
        if (filtered.length === 0) continue;
        const colors = categoryColors[cat] || {};
        html += '<div class="picker-category" style="border-left:3px solid ' + (colors.border || '#334155') + ';padding-left:9px">' + esc(cat) + '</div>';
        for (const t of filtered) {
            const isSelected = selectedTables.some(s => s.name === t);
            html += '<div class="picker-table' + (isSelected ? ' selected' : '') + '" onclick="toggleTable(\'' + esc(t) + '\')">';
            html += (isSelected ? '<span class="check">✓</span>' : '') + esc(t);
            html += '<span class="col-count">' + (schema[t]?.columns.length || 0) + '</span>';
            html += '</div>';
        }
    }
    document.getElementById('pickerList').innerHTML = html;
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

init();
```

- [ ] **Step 2: Test the picker**

Start the server, load a schema, navigate to `/dynamic-query.html`. Verify: nav bar shows with Query active, table picker lists all tables grouped by category, search filters tables.

- [ ] **Step 3: Commit**

```bash
git add public/dynamic-query.html
git commit -m "feat: create query builder page with table picker sidebar"
```

---

### Task 3: Table Selection, Auto-JOIN, and Canvas Rendering

Add the logic for adding/removing tables, auto-detecting JOINs via BFS, generating aliases, and rendering table cards on the canvas.

**Files:**
- Modify: `public/dynamic-query.html`

- [ ] **Step 1: Add alias generation and BFS**

```javascript
function generateAlias(tableName) {
    const parts = tableName.split('_').filter(Boolean);
    let base = parts.length > 1 ? parts.map(p => p[0]).join('') : tableName[0];
    base = base.toLowerCase();
    let alias = base;
    let n = 2;
    while (Object.values(tableAliases).includes(alias)) { alias = base + n; n++; }
    return alias;
}

function findJoinPath(fromTable, toTables) {
    // BFS to find shortest FK path from fromTable to any table in toTables
    const visited = new Set();
    const queue = [{ table: fromTable, path: [] }];
    visited.add(fromTable);

    while (queue.length > 0) {
        const { table, path } = queue.shift();
        const edges = fkGraph[table] || [];
        for (const edge of edges) {
            if (visited.has(edge.table)) continue;
            const newPath = [...path, { from: table, to: edge.table, fromCol: edge.fromCol, toCol: edge.toCol }];
            if (toTables.includes(edge.table)) {
                return newPath;
            }
            visited.add(edge.table);
            queue.push({ table: edge.table, path: newPath });
        }
    }
    return null; // no path found
}

function toggleTable(tableName) {
    const idx = selectedTables.findIndex(s => s.name === tableName);
    if (idx >= 0) {
        removeTable(tableName);
    } else {
        addTable(tableName);
    }
}

function addTable(tableName) {
    if (selectedTables.some(s => s.name === tableName)) return;
    const alias = generateAlias(tableName);
    tableAliases[tableName] = alias;

    if (selectedTables.length === 0) {
        // First table — FROM
        selectedTables.push({ name: tableName, alias, joinType: 'FROM', joinFrom: null, joinFromCol: null, joinToCol: null });
    } else {
        // Find FK path to any existing table
        const existingNames = selectedTables.map(s => s.name);
        const path = findJoinPath(tableName, existingNames);

        if (path) {
            // Add intermediate tables first
            for (let i = 0; i < path.length - 1; i++) {
                const step = path[i];
                if (!selectedTables.some(s => s.name === step.to)) {
                    const intAlias = generateAlias(step.to);
                    tableAliases[step.to] = intAlias;
                    columnSelections[step.to] = {};
                    schema[step.to]?.columns.forEach(c => columnSelections[step.to][c.name] = true);
                    selectedTables.push({ name: step.to, alias: intAlias, joinType: 'INNER', joinFrom: step.from, joinFromCol: step.toCol, joinToCol: step.fromCol });
                }
            }
            // Add the target table
            const lastStep = path[path.length - 1];
            selectedTables.push({ name: tableName, alias, joinType: 'INNER', joinFrom: lastStep.from, joinFromCol: lastStep.toCol, joinToCol: lastStep.fromCol });
        } else {
            // No FK path — cross join with warning
            selectedTables.push({ name: tableName, alias, joinType: 'CROSS', joinFrom: null, joinFromCol: null, joinToCol: null });
        }
    }

    // Default: all columns selected
    columnSelections[tableName] = {};
    schema[tableName]?.columns.forEach(c => columnSelections[tableName][c.name] = true);

    renderAll();
}

function removeTable(tableName) {
    selectedTables = selectedTables.filter(s => s.name !== tableName);
    delete columnSelections[tableName];
    delete tableAliases[tableName];
    // Also remove tables that were joined through this one
    selectedTables = selectedTables.filter(s => s.joinFrom !== tableName);
    // If only one table left, make it FROM
    if (selectedTables.length === 1) {
        selectedTables[0].joinType = 'FROM';
        selectedTables[0].joinFrom = null;
    }
    renderAll();
}

function renderAll() {
    renderPicker();
    renderCanvas();
    generateSQL();
    saveState();
}
```

- [ ] **Step 2: Add canvas rendering**

```javascript
function renderCanvas() {
    const container = document.getElementById('queryCanvas');
    if (selectedTables.length === 0) {
        container.innerHTML = '<div class="canvas-empty">Select a table from the left panel to start building your query</div>';
        return;
    }

    let html = '<div class="table-cards">';
    for (const tbl of selectedTables) {
        const table = schema[tbl.name];
        if (!table) continue;

        // JOIN indicator (before the card, for non-FROM tables)
        if (tbl.joinType !== 'FROM' && tbl.joinFrom) {
            const fromAlias = tableAliases[tbl.joinFrom] || tbl.joinFrom;
            const toAlias = tbl.alias;
            if (tbl.joinType === 'CROSS') {
                html += '<div class="join-indicator">⚠ CROSS JOIN (no FK)</div>';
            } else {
                html += '<div class="join-indicator">' + esc(toAlias) + '.' + esc(tbl.joinFromCol) + ' = ' + esc(fromAlias) + '.' + esc(tbl.joinToCol) + '</div>';
            }
        }

        // Badge color by join type
        const badgeClass = tbl.joinType === 'FROM' ? 'from' : tbl.joinType.toLowerCase();

        html += '<div class="query-card">';
        html += '<div class="query-card-header">';
        html += '<span>' + esc(tbl.name) + '<span class="alias">' + esc(tbl.alias) + '</span></span>';
        html += '<span>';
        if (tbl.joinType === 'FROM') {
            html += '<span class="join-badge from">FROM</span>';
        } else {
            html += '<span class="join-badge ' + badgeClass + '" onclick="cycleJoinType(\'' + esc(tbl.name) + '\')" title="Click to change">' + esc(tbl.joinType) + '</span>';
        }
        html += ' <button class="remove-btn" onclick="removeTable(\'' + esc(tbl.name) + '\')" title="Remove">×</button>';
        html += '</span></div>';

        html += '<div class="query-card-body">';
        html += '<div class="toggle-all" onclick="toggleAllColumns(\'' + esc(tbl.name) + '\')">All / None</div>';
        for (const col of table.columns) {
            const checked = columnSelections[tbl.name]?.[col.name] !== false;
            const isPK = table.primary_keys.includes(col.name);
            const isFK = table.foreign_keys.some(fk => fk.columns.includes(col.name));
            const icon = isPK ? '🔑' : isFK ? '🔗' : '·';
            html += '<label class="query-col">';
            html += '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="toggleColumn(\'' + esc(tbl.name) + '\',\'' + esc(col.name) + '\',this.checked)">';
            html += '<span class="col-icon">' + icon + '</span>';
            html += '<span class="col-name">' + esc(col.name) + '</span>';
            html += '<span class="col-type">' + esc(col.type) + '</span>';
            html += '</label>';
        }
        html += '</div></div>';
    }
    html += '</div>';

    // WHERE section placeholder
    html += '<div id="whereSection"></div>';

    container.innerHTML = html;
    renderWhere();
}

function cycleJoinType(tableName) {
    const tbl = selectedTables.find(s => s.name === tableName);
    if (!tbl || tbl.joinType === 'FROM') return;
    const types = ['INNER', 'LEFT', 'RIGHT'];
    const idx = types.indexOf(tbl.joinType);
    tbl.joinType = types[(idx + 1) % types.length];
    renderAll();
}

function toggleColumn(tableName, colName, checked) {
    if (!columnSelections[tableName]) columnSelections[tableName] = {};
    columnSelections[tableName][colName] = checked;
    generateSQL();
    saveState();
}

function toggleAllColumns(tableName) {
    const table = schema[tableName];
    if (!table) return;
    const allChecked = table.columns.every(c => columnSelections[tableName]?.[c.name] !== false);
    table.columns.forEach(c => { columnSelections[tableName][c.name] = !allChecked; });
    renderAll();
}
```

- [ ] **Step 3: Test table selection and canvas**

Load a schema, click tables in the picker. Verify: first table shows as FROM, second table auto-joins with FK detection, cards show with column checkboxes, cycling JOIN types works, removing a table works.

- [ ] **Step 4: Commit**

```bash
git add public/dynamic-query.html
git commit -m "feat: add table selection, auto-JOIN via FK BFS, and canvas rendering"
```

---

### Task 4: WHERE Clause Builder

**Files:**
- Modify: `public/dynamic-query.html`

- [ ] **Step 1: Add WHERE rendering and logic**

```javascript
function renderWhere() {
    const section = document.getElementById('whereSection');
    if (selectedTables.length === 0) { section.innerHTML = ''; return; }

    let html = '<div class="where-section">';
    html += '<div class="where-title">WHERE Conditions</div>';

    // Build column options for dropdown
    const colOptions = [];
    for (const tbl of selectedTables) {
        const table = schema[tbl.name];
        if (!table) continue;
        for (const col of table.columns) {
            if (columnSelections[tbl.name]?.[col.name] !== false) {
                colOptions.push({ label: tbl.alias + '.' + col.name, value: tbl.alias + '.' + col.name });
            }
        }
    }

    for (let i = 0; i < whereConditions.length; i++) {
        const cond = whereConditions[i];
        html += '<div class="where-row">';
        if (i > 0) {
            html += '<span class="where-connector" onclick="toggleConnector(' + i + ')">' + esc(cond.connector || 'AND') + '</span>';
        }
        html += '<select onchange="updateWhere(' + i + ',\'column\',this.value)">';
        html += '<option value="">Column...</option>';
        for (const opt of colOptions) {
            html += '<option value="' + esc(opt.value) + '"' + (cond.column === opt.value ? ' selected' : '') + '>' + esc(opt.label) + '</option>';
        }
        html += '</select>';
        html += '<select onchange="updateWhere(' + i + ',\'operator\',this.value)">';
        var ops = ['=','!=','>','<','>=','<=','LIKE','IN','IS NULL','IS NOT NULL'];
        for (const op of ops) {
            html += '<option value="' + esc(op) + '"' + (cond.operator === op ? ' selected' : '') + '>' + esc(op) + '</option>';
        }
        html += '</select>';
        if (cond.operator !== 'IS NULL' && cond.operator !== 'IS NOT NULL') {
            const placeholder = cond.operator === 'IN' ? 'val1, val2, ...' : 'value';
            html += '<input type="text" value="' + esc(cond.value || '') + '" placeholder="' + placeholder + '" onchange="updateWhere(' + i + ',\'value\',this.value)">';
        }
        html += '<button class="where-remove" onclick="removeCondition(' + i + ')">×</button>';
        html += '</div>';
    }

    html += '<button class="add-condition-btn" onclick="addCondition()">+ Add Condition</button>';
    html += '</div>';
    section.innerHTML = html;
}

function addCondition() {
    whereConditions.push({ column: '', operator: '=', value: '', connector: 'AND' });
    renderWhere();
    generateSQL();
}

function removeCondition(idx) {
    whereConditions.splice(idx, 1);
    renderAll();
}

function updateWhere(idx, field, value) {
    whereConditions[idx][field] = value;
    if (field === 'operator' && (value === 'IS NULL' || value === 'IS NOT NULL')) {
        whereConditions[idx].value = '';
    }
    generateSQL();
    saveState();
    if (field === 'operator') renderWhere(); // re-render to show/hide value input
}

function toggleConnector(idx) {
    whereConditions[idx].connector = whereConditions[idx].connector === 'AND' ? 'OR' : 'AND';
    renderAll();
}
```

- [ ] **Step 2: Commit**

```bash
git add public/dynamic-query.html
git commit -m "feat: add WHERE clause builder with condition rows"
```

---

### Task 5: SQL Generation and Preview Panel

**Files:**
- Modify: `public/dynamic-query.html`

- [ ] **Step 1: Add SQL generation**

```javascript
function quoteId(name) {
    if (dialect === 'postgres') return '"' + name + '"';
    if (dialect === 'mssql') return '[' + name + ']';
    return '`' + name + '`';
}

function generateSQL() {
    if (selectedTables.length === 0) {
        document.getElementById('sqlContent').innerHTML = '<span class="sql-kw">-- Select tables to build a query</span>';
        return;
    }

    const lines = [];

    // SELECT
    const selectCols = [];
    for (const tbl of selectedTables) {
        const table = schema[tbl.name];
        if (!table) continue;
        for (const col of table.columns) {
            if (columnSelections[tbl.name]?.[col.name] !== false) {
                selectCols.push(tbl.alias + '.' + quoteId(col.name));
            }
        }
    }
    if (selectCols.length === 0) selectCols.push('*');
    lines.push('SELECT');
    lines.push('    ' + selectCols.join(',\n    '));

    // FROM
    const fromTbl = selectedTables[0];
    lines.push('FROM ' + quoteId(fromTbl.name) + ' ' + fromTbl.alias);

    // JOINs
    for (let i = 1; i < selectedTables.length; i++) {
        const tbl = selectedTables[i];
        if (tbl.joinType === 'CROSS') {
            lines.push('CROSS JOIN ' + quoteId(tbl.name) + ' ' + tbl.alias);
        } else {
            const fromAlias = tableAliases[tbl.joinFrom] || tbl.joinFrom;
            lines.push(tbl.joinType + ' JOIN ' + quoteId(tbl.name) + ' ' + tbl.alias + ' ON ' + tbl.alias + '.' + quoteId(tbl.joinFromCol) + ' = ' + fromAlias + '.' + quoteId(tbl.joinToCol));
        }
    }

    // WHERE
    const validConditions = whereConditions.filter(c => c.column && c.operator);
    if (validConditions.length > 0) {
        lines.push('WHERE');
        for (let i = 0; i < validConditions.length; i++) {
            const c = validConditions[i];
            let clause = '';
            if (i > 0) clause += '    ' + (c.connector || 'AND') + ' ';
            else clause += '    ';

            clause += c.column + ' ' + c.operator;
            if (c.operator !== 'IS NULL' && c.operator !== 'IS NOT NULL') {
                const val = c.value || '';
                if (c.operator === 'IN') {
                    const items = val.split(',').map(v => {
                        v = v.trim();
                        return isNaN(v) ? "'" + v.replace(/'/g, "''") + "'" : v;
                    });
                    clause += ' (' + items.join(', ') + ')';
                } else if (isNaN(val) || val === '') {
                    clause += " '" + val.replace(/'/g, "''") + "'";
                } else {
                    clause += ' ' + val;
                }
            }
            lines.push(clause);
        }
    }

    const sql = lines.join('\n');
    document.getElementById('sqlContent').innerHTML = highlightSQL(sql);
}

function highlightSQL(sql) {
    // Escape HTML first
    let h = esc(sql);
    // Keywords
    h = h.replace(/\b(SELECT|FROM|INNER|LEFT|RIGHT|CROSS|JOIN|ON|WHERE|AND|OR|AS|IN|LIKE|IS|NULL|NOT|ORDER|BY|GROUP|HAVING|LIMIT)\b/g, '<span class="sql-kw">$1</span>');
    // Strings
    h = h.replace(/'([^']*)'/g, '<span class="sql-str">\'$1\'</span>');
    // Numbers (standalone)
    h = h.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-num">$1</span>');
    return h;
}
```

- [ ] **Step 2: Add copy and download handlers**

```javascript
function copySQL() {
    const sql = document.getElementById('sqlContent').textContent;
    navigator.clipboard.writeText(sql).then(() => showToast('SQL copied to clipboard!')).catch(() => showToast('Failed to copy'));
}

function downloadSQL() {
    const sql = document.getElementById('sqlContent').textContent;
    const date = new Date().toISOString().split('T')[0];
    const blob = new Blob([sql], { type: 'text/sql' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'query-' + date + '.sql';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('SQL downloaded!');
}

function changeDialect(value) {
    dialect = value;
    generateSQL();
}
```

- [ ] **Step 3: Add state persistence**

```javascript
function saveState() {
    const state = { selectedTables, columnSelections, whereConditions, tableAliases, dialect };
    sessionStorage.setItem('dbdiagram_query_state', JSON.stringify(state));
}

function loadState() {
    const raw = sessionStorage.getItem('dbdiagram_query_state');
    if (!raw) return;
    try {
        const state = JSON.parse(raw);
        selectedTables = state.selectedTables || [];
        columnSelections = state.columnSelections || {};
        whereConditions = state.whereConditions || [];
        tableAliases = state.tableAliases || {};
        dialect = state.dialect || 'mysql';
        document.getElementById('dialectSelect').value = dialect;
        renderAll();
    } catch(e) {}
}

// Call after init
init();
loadState();
```

- [ ] **Step 4: Test the full flow**

Load a schema. Add 2-3 tables, verify auto-JOIN. Uncheck some columns. Add WHERE conditions. Verify SQL updates live. Change dialect. Copy SQL. Navigate away and back — verify state persists.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-query.html
git commit -m "feat: add SQL generation, preview with syntax highlighting, and state persistence"
```

---

### Task 6: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Query Builder to README**

Add a new section after "Schema Comparison":

```markdown
### Query Builder
- **Visual Query Builder** — Dedicated page to visually build SQL queries. Pick tables from a categorized sidebar, auto-JOIN via FK relationship detection (BFS shortest path), select columns with checkboxes, and add WHERE conditions
- **Live SQL Preview** — Real-time syntax-highlighted SQL output that updates as you build. Dialect-aware quoting for MySQL, PostgreSQL, and SQL Server
- **Copy & Download** — Copy the generated SQL to clipboard or download as a `.sql` file
```

Update the Project Structure to include `dynamic-query.html`:

```
│   ├── dynamic-query.html       # Interactive SQL query builder
```

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: add query builder to README"
git push
```
