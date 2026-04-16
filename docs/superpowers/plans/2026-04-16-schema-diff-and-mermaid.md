# Schema Diff & Mermaid Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Mermaid ER diagram export to all view pages and build a dedicated schema diff comparison page with source selectors, client-side diff engine, and color-coded results display.

**Architecture:** Mermaid export follows the existing export pattern (generate text client-side, Blob download). The diff page is a new HTML file with inline CSS/JS (matching the project pattern), featuring split source-selector panels, a comparison engine, and diff-result cards. Both features integrate with the global nav bar and Export/Share dropdown.

**Tech Stack:** Vanilla JavaScript (ES6), CSS3 flexbox/grid, Fetch API, existing `/api/schema` and `/api/schema-from-sql` endpoints

**Spec:** `docs/superpowers/specs/2026-04-16-schema-diff-and-mermaid-design.md`

---

### Task 1: Add Mermaid Export to All View Pages

Add `downloadMermaid()` and `copyMermaid()` to all 3 existing view pages plus export dropdown buttons.

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`

- [ ] **Step 1: Add Mermaid functions to `dynamic-list.html`**

Add after the `downloadMarkdown()` function (around line 1340):

```javascript
function generateMermaid(schema, categories) {
    let mermaid = 'erDiagram\n';

    const ordered = categories
        ? Object.entries(categories)
        : [['All Tables', Object.keys(schema).sort()]];

    for (const [cat, tables] of ordered) {
        mermaid += `    %% Category: ${cat}\n`;
        for (const t of tables) {
            const tbl = schema[t];
            if (!tbl) continue;
            mermaid += `    ${t} {\n`;
            for (const col of tbl.columns) {
                const isPK = tbl.primary_keys.includes(col.name);
                const isFK = tbl.foreign_keys.some(fk => fk.columns.includes(col.name));
                const marker = isPK ? ' PK' : isFK ? ' FK' : '';
                const type = col.type.replace(/\(\d+\)$/, '').replace(/\s+/g, '_');
                mermaid += `        ${type} ${col.name}${marker}\n`;
            }
            mermaid += `    }\n`;
        }
    }

    // Relationships
    for (const [t, tbl] of Object.entries(schema)) {
        for (const fk of tbl.foreign_keys) {
            if (schema[fk.ref_table]) {
                mermaid += `    ${t} }o--|| ${fk.ref_table} : "${fk.columns.join(', ')}"\n`;
            }
        }
    }

    return mermaid;
}

function downloadMermaid() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }
    const data = JSON.parse(raw);
    const schema = data.schema;
    const dbName = data.database || 'Database';
    const date = new Date().toISOString().split('T')[0];

    const { categories } = autoCategorize(schema);
    const mermaid = generateMermaid(schema, categories);
    const md = '```mermaid\n' + mermaid + '```\n';

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schema-${dbName.replace(/[^a-zA-Z0-9]/g, '_')}-${date}.mermaid.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Mermaid diagram downloaded!');
}

function copyMermaid() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }
    const data = JSON.parse(raw);
    const schema = data.schema;

    const { categories } = autoCategorize(schema);
    const mermaid = generateMermaid(schema, categories);

    navigator.clipboard.writeText(mermaid).then(() => {
        showToast('Mermaid diagram copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy to clipboard');
    });
}
```

- [ ] **Step 2: Add Mermaid buttons to Export dropdown in `dynamic-list.html`**

Find the Export dropdown menu (around line 370). Add after the Download Markdown button, before the closing `</div>` of `.export-menu`:

```html
<button onclick="downloadMermaid()"><span class="icon">🧜</span> Download Mermaid</button>
<button onclick="copyMermaid()"><span class="icon">📋</span> Copy Mermaid</button>
```

- [ ] **Step 3: Add same Mermaid functions to `dynamic-visual.html`**

Add `generateMermaid()`, `downloadMermaid()`, and `copyMermaid()` (identical to list.html since visual also has `autoCategorize`). Add the two buttons to the Export dropdown (after the Download Markdown button, before the `<hr>` separator).

- [ ] **Step 4: Add Mermaid functions to `dynamic-analysis.html`**

Same functions but `downloadMermaid()` and `copyMermaid()` use `null` for categories (no `autoCategorize` on this page):

```javascript
function downloadMermaid() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }
    const data = JSON.parse(raw);
    const schema = data.schema;
    const dbName = data.database || 'Database';
    const date = new Date().toISOString().split('T')[0];

    const mermaid = generateMermaid(schema, null);
    const md = '```mermaid\n' + mermaid + '```\n';

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schema-${dbName.replace(/[^a-zA-Z0-9]/g, '_')}-${date}.mermaid.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Mermaid diagram downloaded!');
}

function copyMermaid() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }
    const data = JSON.parse(raw);
    const mermaid = generateMermaid(data.schema, null);
    navigator.clipboard.writeText(mermaid).then(() => {
        showToast('Mermaid diagram copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy to clipboard');
    });
}
```

Add the two Mermaid buttons to the analysis Export dropdown.

- [ ] **Step 5: Test Mermaid export**

Load a schema, click Download Mermaid → verify the file contains valid Mermaid ER syntax. Click Copy Mermaid → paste into a GitHub issue or https://mermaid.live to verify it renders.

- [ ] **Step 6: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html
git commit -m "feat: add Mermaid ER diagram export and clipboard copy to all views"
```

---

### Task 2: Add Diff Tab to Nav Bar on All Pages

Add a dimmed "Diff" tab to the navigation on all existing view pages.

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`

- [ ] **Step 1: Add Diff tab CSS to all 3 pages**

Add after the existing `.nav-tab.active` rule:

```css
.nav-tab.diff-tab { opacity: 0.4; }
.nav-tab.diff-tab.has-diff { opacity: 1; }
```

- [ ] **Step 2: Add Diff tab HTML to `dynamic-list.html` nav**

In the `.nav-center` section (around line 362), add after the Analysis tab:

```html
<a href="/dynamic-diff.html" class="nav-tab diff-tab" id="diffTab">Diff</a>
```

- [ ] **Step 3: Add Diff tab JS to `dynamic-list.html`**

Add in the database badge IIFE (or as a separate IIFE after it):

```javascript
(function() {
    const diffTab = document.getElementById('diffTab');
    if (diffTab && sessionStorage.getItem('dbdiagram_diff_a')) {
        diffTab.classList.add('has-diff');
    }
})();
```

- [ ] **Step 4: Add same Diff tab HTML, CSS, and JS to `dynamic-visual.html` and `dynamic-analysis.html`**

Same CSS rule, same `<a>` element in `.nav-center`, same IIFE check.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html
git commit -m "feat: add dimmed Diff tab to nav bar on all view pages"
```

---

### Task 3: Add Compare Schemas Link to Index Page

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add Compare link CSS**

Add before closing `</style>`:

```css
.compare-link { display: block; text-align: center; margin-top: 20px; color: #94a3b8; font-size: 14px; text-decoration: none; padding: 10px; border: 1px dashed #334155; border-radius: 8px; transition: all 0.15s; }
.compare-link:hover { color: #e2e8f0; border-color: #6366f1; }
```

- [ ] **Step 2: Add Compare link HTML**

Find the closing `</div>` tags at the end of the form container (around line 493-495). Add a Compare link just before the card's closing `</div>`:

```html
<a href="/dynamic-diff.html" class="compare-link">Compare Two Schemas →</a>
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: add Compare Schemas link to index page"
```

---

### Task 4: Create Schema Diff Page — Layout and Source Selectors

Build the new `dynamic-diff.html` page with the source selector UI (no diff logic yet).

**Files:**
- Create: `public/dynamic-diff.html`

- [ ] **Step 1: Create the full page structure**

Create `public/dynamic-diff.html` with:
- Full HTML document with dark theme CSS (matching other pages)
- Global nav bar (Diff tab active) with Export/Share dropdown (Share Link, Markdown, Mermaid, Copy Mermaid)
- Toast notification system
- Database badge JS
- Diff tab visibility JS
- Two side-by-side source selector panels ("Schema A" and "Schema B")
- Each panel has a source type dropdown (Current Schema / Live Connection / SQL Paste)
- Live Connection shows: dbType, host, port, user, password, database fields
- SQL Paste shows: textarea + file drop area
- Current Schema option shows a confirmation badge if `dbdiagram_data` exists in sessionStorage
- A "Compare" button between the panels (disabled until both schemas are loaded)
- A results container (empty, populated by Task 5)
- Click-outside handler for export dropdown
- Stub functions for exports: `shareLink()`, `downloadMarkdown()`, `downloadMermaid()`, `copyMermaid()`

The page should have its own CSS for the source panels:

```css
.diff-container { max-width: 1400px; margin: 0 auto; padding: 20px; }
.source-panels { display: flex; gap: 20px; margin-bottom: 20px; }
.source-panel { flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
.source-panel h3 { color: #f8fafc; font-size: 16px; margin-bottom: 12px; }
.source-select { width: 100%; padding: 8px 12px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: #e2e8f0; font-size: 14px; margin-bottom: 12px; }
.source-fields { display: none; }
.source-fields.active { display: block; }
.source-badge { display: inline-block; background: #22c55e20; border: 1px solid #22c55e; color: #22c55e; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 8px; }
.compare-btn { display: block; margin: 0 auto 30px; padding: 12px 32px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; }
.compare-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.compare-btn:not(:disabled):hover { background: linear-gradient(135deg, #818cf8, #6366f1); }
```

Form fields within each panel should reuse the styling from `index.html` (dark inputs with `#0f172a` background, `#475569` border, `#e2e8f0` text).

- [ ] **Step 2: Add source selector JS logic**

Each panel needs JS to:
1. Toggle visibility of Live Connection / SQL Paste / Current Schema fields based on the source dropdown
2. For "Current Schema": check sessionStorage and show a confirmation badge ("mydb — 35 tables")
3. For "Live Connection": fetch `/api/schema` when a "Load" button is clicked, store result
4. For "SQL Paste": fetch `/api/schema-from-sql` when a "Parse" button is clicked, store result
5. Track `schemaA` and `schemaB` as JS variables. Enable the Compare button when both are loaded.

```javascript
let schemaA = null;
let schemaB = null;

function updateCompareButton() {
    document.getElementById('compareBtn').disabled = !(schemaA && schemaB);
}

async function loadLiveSchema(panel) {
    const prefix = panel === 'a' ? 'a' : 'b';
    const dbType = document.getElementById(`${prefix}-dbType`).value;
    const host = document.getElementById(`${prefix}-host`).value;
    const port = document.getElementById(`${prefix}-port`).value;
    const user = document.getElementById(`${prefix}-user`).value;
    const password = document.getElementById(`${prefix}-password`).value;
    const database = document.getElementById(`${prefix}-database`).value;

    if (!host || !database) { showToast('Host and database are required'); return; }

    try {
        const res = await fetch('/api/schema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbType, host, port, user, password, database })
        });
        const data = await res.json();
        if (data.error) { showToast('Error: ' + data.error); return; }
        if (panel === 'a') schemaA = data; else schemaB = data;
        showBadge(prefix, data.database, Object.keys(data.schema).length);
        updateCompareButton();
    } catch (err) {
        showToast('Connection failed: ' + err.message);
    }
}

async function parseSqlSchema(panel) {
    const prefix = panel === 'a' ? 'a' : 'b';
    const sql = document.getElementById(`${prefix}-sql`).value.trim();
    if (!sql) { showToast('Paste some SQL first'); return; }

    try {
        const res = await fetch('/api/schema-from-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });
        const data = await res.json();
        if (data.error) { showToast('Error: ' + data.error); return; }
        if (panel === 'a') schemaA = data; else schemaB = data;
        showBadge(prefix, data.database, Object.keys(data.schema).length);
        updateCompareButton();
    } catch (err) {
        showToast('Parse failed: ' + err.message);
    }
}

function loadCurrentSchema(panel) {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No current schema loaded'); return; }
    const data = JSON.parse(raw);
    if (panel === 'a') schemaA = data; else schemaB = data;
    const prefix = panel === 'a' ? 'a' : 'b';
    showBadge(prefix, data.database, Object.keys(data.schema).length);
    updateCompareButton();
}

function showBadge(prefix, name, count) {
    const badge = document.getElementById(`${prefix}-badge`);
    badge.textContent = `${name} — ${count} tables`;
    badge.style.display = 'inline-block';
}
```

- [ ] **Step 3: Test the page layout**

Start the server, navigate to `/dynamic-diff.html`. Verify:
- Nav bar shows with Diff tab active
- Two source panels display side by side
- Source type dropdowns toggle field visibility
- Compare button is disabled
- Loading a Current Schema shows the badge

- [ ] **Step 4: Commit**

```bash
git add public/dynamic-diff.html
git commit -m "feat: create schema diff page with source selector UI"
```

---

### Task 5: Implement Diff Engine and Results Display

Add the comparison algorithm and results rendering to the diff page.

**Files:**
- Modify: `public/dynamic-diff.html`

- [ ] **Step 1: Add the diff algorithm**

```javascript
function computeDiff(a, b) {
    const schemaA = a.schema;
    const schemaB = b.schema;
    const namesA = Object.keys(schemaA).map(n => n.toLowerCase());
    const namesB = Object.keys(schemaB).map(n => n.toLowerCase());

    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];

    // Tables in B but not A
    for (const name of Object.keys(schemaB)) {
        if (!schemaA[name] && !schemaA[name.toLowerCase()]) {
            added.push({ name, table: schemaB[name] });
        }
    }

    // Tables in A but not B
    for (const name of Object.keys(schemaA)) {
        if (!schemaB[name] && !schemaB[name.toLowerCase()]) {
            removed.push({ name, table: schemaA[name] });
        }
    }

    // Tables in both — check for modifications
    for (const name of Object.keys(schemaA)) {
        const tblA = schemaA[name];
        const tblB = schemaB[name] || schemaB[name.toLowerCase()];
        if (!tblB) continue;

        const changes = diffTable(tblA, tblB);
        if (changes.hasChanges) {
            modified.push({ name, changes });
        } else {
            unchanged.push(name);
        }
    }

    return { added, removed, modified, unchanged, nameA: a.database, nameB: b.database, countA: Object.keys(schemaA).length, countB: Object.keys(schemaB).length };
}

function diffTable(a, b) {
    const result = { addedCols: [], removedCols: [], changedCols: [], addedFKs: [], removedFKs: [], addedKeys: [], removedKeys: [], pkChanged: false, hasChanges: false };

    // Column diff
    const colsA = new Map(a.columns.map(c => [c.name, c]));
    const colsB = new Map(b.columns.map(c => [c.name, c]));

    for (const [name, col] of colsB) {
        if (!colsA.has(name)) { result.addedCols.push(col); result.hasChanges = true; }
    }
    for (const [name, col] of colsA) {
        if (!colsB.has(name)) { result.removedCols.push(col); result.hasChanges = true; }
    }
    for (const [name, colA] of colsA) {
        const colB = colsB.get(name);
        if (!colB) continue;
        const diffs = [];
        if (colA.type !== colB.type) diffs.push({ field: 'type', from: colA.type, to: colB.type });
        if (colA.nullable !== colB.nullable) diffs.push({ field: 'nullable', from: colA.nullable, to: colB.nullable });
        if (colA.auto_increment !== colB.auto_increment) diffs.push({ field: 'auto_increment', from: colA.auto_increment, to: colB.auto_increment });
        if (diffs.length > 0) { result.changedCols.push({ name, diffs }); result.hasChanges = true; }
    }

    // PK diff
    const pkA = (a.primary_keys || []).sort().join(',');
    const pkB = (b.primary_keys || []).sort().join(',');
    if (pkA !== pkB) { result.pkChanged = true; result.hasChanges = true; }

    // FK diff
    const fkKeyA = new Set(a.foreign_keys.map(fk => `${fk.columns.join(',')}>${fk.ref_table}.${fk.ref_columns.join(',')}`));
    const fkKeyB = new Set(b.foreign_keys.map(fk => `${fk.columns.join(',')}>${fk.ref_table}.${fk.ref_columns.join(',')}`));
    for (const fk of b.foreign_keys) {
        const key = `${fk.columns.join(',')}>${fk.ref_table}.${fk.ref_columns.join(',')}`;
        if (!fkKeyA.has(key)) { result.addedFKs.push(fk); result.hasChanges = true; }
    }
    for (const fk of a.foreign_keys) {
        const key = `${fk.columns.join(',')}>${fk.ref_table}.${fk.ref_columns.join(',')}`;
        if (!fkKeyB.has(key)) { result.removedFKs.push(fk); result.hasChanges = true; }
    }

    // Index diff
    const idxKeyA = new Set((a.keys || []).map(k => k.columns.sort().join(',')));
    const idxKeyB = new Set((b.keys || []).map(k => k.columns.sort().join(',')));
    for (const k of (b.keys || [])) {
        if (!idxKeyA.has(k.columns.sort().join(','))) { result.addedKeys.push(k); result.hasChanges = true; }
    }
    for (const k of (a.keys || [])) {
        if (!idxKeyB.has(k.columns.sort().join(','))) { result.removedKeys.push(k); result.hasChanges = true; }
    }

    return result;
}
```

- [ ] **Step 2: Add results rendering**

```javascript
function renderDiff(diff) {
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let html = '';

    // Summary stats bar
    html += `<div class="diff-summary">
        <span>${esc(diff.nameA)} (${diff.countA} tables)</span>
        <span class="diff-arrow">→</span>
        <span>${esc(diff.nameB)} (${diff.countB} tables)</span>
        <div class="diff-stats">
            <span class="stat-added">+${diff.added.length} added</span>
            <span class="stat-removed">-${diff.removed.length} removed</span>
            <span class="stat-modified">${diff.modified.length} modified</span>
            <span class="stat-unchanged">${diff.unchanged.length} unchanged</span>
        </div>
    </div>`;

    // Added tables
    if (diff.added.length > 0) {
        html += `<div class="diff-section"><h2 class="diff-heading added">Added Tables (${diff.added.length})</h2>`;
        for (const { name, table } of diff.added) {
            html += renderTableCard(name, table, 'added', esc);
        }
        html += `</div>`;
    }

    // Removed tables
    if (diff.removed.length > 0) {
        html += `<div class="diff-section"><h2 class="diff-heading removed">Removed Tables (${diff.removed.length})</h2>`;
        for (const { name, table } of diff.removed) {
            html += renderTableCard(name, table, 'removed', esc);
        }
        html += `</div>`;
    }

    // Modified tables
    if (diff.modified.length > 0) {
        html += `<div class="diff-section"><h2 class="diff-heading modified">Modified Tables (${diff.modified.length})</h2>`;
        for (const { name, changes } of diff.modified) {
            html += renderModifiedCard(name, changes, esc);
        }
        html += `</div>`;
    }

    // Unchanged toggle
    if (diff.unchanged.length > 0) {
        html += `<div class="diff-section"><button class="unchanged-toggle" onclick="this.nextElementSibling.classList.toggle('hidden');this.textContent=this.textContent.includes('Show')?'Hide ${diff.unchanged.length} unchanged tables':'Show ${diff.unchanged.length} unchanged tables'">Show ${diff.unchanged.length} unchanged tables</button>
        <div class="unchanged-list hidden">${diff.unchanged.map(n => `<span class="unchanged-chip">${esc(n)}</span>`).join('')}</div></div>`;
    }

    document.getElementById('diffResults').innerHTML = html;

    // Store for diff tab visibility
    sessionStorage.setItem('dbdiagram_diff_a', JSON.stringify(schemaA));
    sessionStorage.setItem('dbdiagram_diff_b', JSON.stringify(schemaB));
}

function renderTableCard(name, table, type, esc) {
    let html = `<div class="diff-card ${type}"><div class="diff-card-header">${esc(name)} <span class="col-count">${table.columns.length} cols</span></div><div class="diff-card-body"><table>`;
    for (const col of table.columns) {
        html += `<tr><td>${esc(col.name)}</td><td class="col-type">${esc(col.type)}</td><td>${col.nullable ? 'NULL' : 'NOT NULL'}</td></tr>`;
    }
    html += `</table></div></div>`;
    return html;
}

function renderModifiedCard(name, changes, esc) {
    let html = `<div class="diff-card modified"><div class="diff-card-header">${esc(name)}</div><div class="diff-card-body">`;

    if (changes.addedCols.length) {
        html += `<div class="change-group"><span class="change-label added">+ Columns</span>`;
        for (const col of changes.addedCols) html += `<div class="change-row added">${esc(col.name)} <span class="col-type">${esc(col.type)}</span></div>`;
        html += `</div>`;
    }
    if (changes.removedCols.length) {
        html += `<div class="change-group"><span class="change-label removed">- Columns</span>`;
        for (const col of changes.removedCols) html += `<div class="change-row removed">${esc(col.name)} <span class="col-type">${esc(col.type)}</span></div>`;
        html += `</div>`;
    }
    if (changes.changedCols.length) {
        html += `<div class="change-group"><span class="change-label modified">~ Changed</span>`;
        for (const { name: colName, diffs } of changes.changedCols) {
            const desc = diffs.map(d => `${d.field}: ${d.from} → ${d.to}`).join(', ');
            html += `<div class="change-row modified">${esc(colName)} <span class="change-detail">${esc(desc)}</span></div>`;
        }
        html += `</div>`;
    }
    if (changes.pkChanged) html += `<div class="change-row modified">Primary key changed</div>`;
    if (changes.addedFKs.length) {
        for (const fk of changes.addedFKs) html += `<div class="change-row added">+ FK: ${esc(fk.columns.join(','))} → ${esc(fk.ref_table)}</div>`;
    }
    if (changes.removedFKs.length) {
        for (const fk of changes.removedFKs) html += `<div class="change-row removed">- FK: ${esc(fk.columns.join(','))} → ${esc(fk.ref_table)}</div>`;
    }
    if (changes.addedKeys.length) {
        for (const k of changes.addedKeys) html += `<div class="change-row added">+ Index: ${esc(k.columns.join(','))}</div>`;
    }
    if (changes.removedKeys.length) {
        for (const k of changes.removedKeys) html += `<div class="change-row removed">- Index: ${esc(k.columns.join(','))}</div>`;
    }

    html += `</div></div>`;
    return html;
}
```

- [ ] **Step 3: Add diff result CSS**

```css
.diff-summary { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px 24px; text-align: center; margin-bottom: 24px; color: #e2e8f0; font-size: 15px; }
.diff-arrow { color: #6366f1; margin: 0 12px; }
.diff-stats { margin-top: 8px; display: flex; gap: 16px; justify-content: center; font-size: 13px; }
.stat-added { color: #22c55e; } .stat-removed { color: #ef4444; } .stat-modified { color: #eab308; } .stat-unchanged { color: #94a3b8; }
.diff-section { margin-bottom: 24px; }
.diff-heading { font-size: 16px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #334155; }
.diff-heading.added { color: #22c55e; } .diff-heading.removed { color: #ef4444; } .diff-heading.modified { color: #eab308; }
.diff-card { border: 1px solid #334155; border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
.diff-card.added { border-color: #22c55e; background: rgba(34,197,94,0.05); }
.diff-card.removed { border-color: #ef4444; background: rgba(239,68,68,0.05); }
.diff-card.modified { border-color: #eab308; background: rgba(234,179,8,0.05); }
.diff-card-header { padding: 10px 16px; font-weight: 600; color: #f8fafc; background: rgba(255,255,255,0.03); }
.diff-card-body { padding: 12px 16px; }
.diff-card-body table { width: 100%; border-collapse: collapse; font-size: 13px; }
.diff-card-body td { padding: 4px 8px; border-top: 1px solid rgba(255,255,255,0.05); }
.col-type { color: #818cf8; font-family: monospace; font-size: 12px; }
.col-count { font-weight: 400; font-size: 12px; color: #94a3b8; }
.change-group { margin-bottom: 8px; }
.change-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.change-label.added { color: #22c55e; } .change-label.removed { color: #ef4444; } .change-label.modified { color: #eab308; }
.change-row { padding: 4px 0; font-size: 13px; }
.change-row.added { color: #86efac; } .change-row.removed { color: #fca5a5; } .change-row.modified { color: #fde68a; }
.change-detail { color: #94a3b8; font-size: 12px; }
.unchanged-toggle { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.unchanged-toggle:hover { color: #e2e8f0; }
.unchanged-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.unchanged-list.hidden { display: none; }
.unchanged-chip { background: #1e293b; border: 1px solid #334155; padding: 4px 12px; border-radius: 20px; font-size: 12px; color: #94a3b8; }
```

- [ ] **Step 4: Wire the Compare button**

```javascript
document.getElementById('compareBtn').addEventListener('click', () => {
    if (!schemaA || !schemaB) return;
    showToast('Comparing schemas...');
    const diff = computeDiff(schemaA, schemaB);
    renderDiff(diff);
});
```

- [ ] **Step 5: Test the diff engine**

Use two different schemas (e.g., the 7-table blog schema as A, the 35-table e-commerce schema as B via SQL paste). Verify added/removed/modified sections render correctly with proper colors.

- [ ] **Step 6: Commit**

```bash
git add public/dynamic-diff.html
git commit -m "feat: implement schema diff engine and results display"
```

---

### Task 6: Add Diff Page Exports and Markdown Diff Report

Add working export functions to the diff page.

**Files:**
- Modify: `public/dynamic-diff.html`

- [ ] **Step 1: Implement diff-specific exports**

Replace the stub functions with working implementations:

```javascript
// Share Link — compresses both schemas into URL hash
async function shareLink() {
    if (!schemaA || !schemaB) { showToast('Run a comparison first'); return; }
    const payload = JSON.stringify({ a: schemaA, b: schemaB });
    try {
        let encoded;
        if (typeof CompressionStream !== 'undefined') {
            const blob = new Blob([payload]);
            const cs = new CompressionStream('gzip');
            const compressedBlob = await new Response(blob.stream().pipeThrough(cs)).blob();
            const buffer = await compressedBlob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            encoded = 'gz:' + btoa(binary);
        } else {
            encoded = 'raw:' + btoa(unescape(encodeURIComponent(payload)));
        }
        if (encoded.length > 200000) { showToast('Schemas too large for URL sharing', 5000); return; }
        const url = window.location.origin + '/dynamic-diff.html#diff=' + encodeURIComponent(encoded);
        await navigator.clipboard.writeText(url);
        showToast('Diff link copied to clipboard!');
    } catch (err) { showToast('Failed: ' + err.message); }
}

// Markdown diff report
function downloadMarkdown() {
    if (!schemaA || !schemaB) { showToast('Run a comparison first'); return; }
    const diff = computeDiff(schemaA, schemaB);
    const date = new Date().toISOString().split('T')[0];
    let md = `# Schema Diff Report\n> Generated ${date}\n\n`;
    md += `**${diff.nameA}** (${diff.countA} tables) → **${diff.nameB}** (${diff.countB} tables)\n\n`;
    md += `| Change | Count |\n|--------|-------|\n`;
    md += `| Added | ${diff.added.length} |\n| Removed | ${diff.removed.length} |\n| Modified | ${diff.modified.length} |\n| Unchanged | ${diff.unchanged.length} |\n\n`;

    if (diff.added.length) {
        md += `## Added Tables\n\n`;
        for (const { name, table } of diff.added) {
            md += `### + ${name}\n| Column | Type | Nullable |\n|--------|------|----------|\n`;
            for (const col of table.columns) md += `| ${col.name} | ${col.type} | ${col.nullable ? 'YES' : 'NO'} |\n`;
            md += `\n`;
        }
    }
    if (diff.removed.length) {
        md += `## Removed Tables\n\n`;
        for (const { name } of diff.removed) md += `- ~~${name}~~\n`;
        md += `\n`;
    }
    if (diff.modified.length) {
        md += `## Modified Tables\n\n`;
        for (const { name, changes } of diff.modified) {
            md += `### ~ ${name}\n`;
            for (const col of changes.addedCols) md += `- + Column: ${col.name} (${col.type})\n`;
            for (const col of changes.removedCols) md += `- - Column: ${col.name} (${col.type})\n`;
            for (const { name: cn, diffs } of changes.changedCols) md += `- ~ ${cn}: ${diffs.map(d => `${d.field}: ${d.from} → ${d.to}`).join(', ')}\n`;
            for (const fk of changes.addedFKs) md += `- + FK: ${fk.columns.join(',')} → ${fk.ref_table}\n`;
            for (const fk of changes.removedFKs) md += `- - FK: ${fk.columns.join(',')} → ${fk.ref_table}\n`;
            md += `\n`;
        }
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diff-${date}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Diff report downloaded!');
}

// Mermaid export (Schema B)
function downloadMermaid() {
    if (!schemaB) { showToast('Load Schema B first'); return; }
    const mermaid = generateMermaid(schemaB.schema, null);
    const md = '```mermaid\n' + mermaid + '```\n';
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schema-b-${new Date().toISOString().split('T')[0]}.mermaid.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Mermaid diagram downloaded!');
}

function copyMermaid() {
    if (!schemaB) { showToast('Load Schema B first'); return; }
    const mermaid = generateMermaid(schemaB.schema, null);
    navigator.clipboard.writeText(mermaid).then(() => showToast('Copied!')).catch(() => showToast('Failed'));
}
```

- [ ] **Step 2: Add diff hash detection on page load**

At the top of the `<script>` block, add an IIFE to detect `#diff=` hash (for shared diff links):

```javascript
(async function checkDiffHash() {
    const hash = window.location.hash;
    if (!hash.startsWith('#diff=')) return;
    const encoded = decodeURIComponent(hash.slice(6));
    try {
        let json;
        if (encoded.startsWith('gz:')) {
            const binary = atob(encoded.slice(3));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes]);
            json = await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
        } else if (encoded.startsWith('raw:')) {
            json = decodeURIComponent(escape(atob(encoded.slice(4))));
        } else return;
        const { a, b } = JSON.parse(json);
        if (a && b && a.schema && b.schema) {
            schemaA = a; schemaB = b;
            updateCompareButton();
            showBadge('a', a.database, Object.keys(a.schema).length);
            showBadge('b', b.database, Object.keys(b.schema).length);
            document.getElementById('compareBtn').click();
        }
    } catch (err) { console.error('Failed to load shared diff:', err); }
})();
```

- [ ] **Step 3: Commit**

```bash
git add public/dynamic-diff.html
git commit -m "feat: add diff page exports (share link, markdown report, mermaid)"
```

---

### Task 7: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add new features to README**

Add under the "Export & Sharing" section:

```markdown
- **Mermaid Export** — Download or copy a Mermaid `erDiagram` block for embedding in GitHub READMEs, Notion, or any Mermaid-compatible tool
```

Add a new section after "Export & Sharing":

```markdown
### Schema Comparison
- **Schema Diff** — Compare two schemas side-by-side from any combination of live connections, SQL files, or the currently loaded schema. Shows added, removed, and modified tables with column-level change details
- **Diff Export** — Download the comparison as a Markdown report or share via compressed URL
```

Update the Project Structure to include `dynamic-diff.html`.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Mermaid export and schema diff to README"
```
