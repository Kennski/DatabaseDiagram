# Export & Sharing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified export/sharing system (shareable URLs, HTML/PDF/Markdown export, enhanced PNG/SVG with metadata, image re-import) — all client-side with zero new dependencies.

**Architecture:** Each export feature is implemented as inline JS in the existing HTML files. A shared export dropdown and toast notification system is added to all three view pages. The index page gains URL hash detection for shareable links and drag-and-drop support for PNG/SVG re-import.

**Tech Stack:** Vanilla JavaScript (ES6), browser APIs (CompressionStream, Blob, Canvas, DOMParser, window.print())

**Spec:** `docs/superpowers/specs/2026-04-15-export-sharing-design.md`

---

### Task 1: Add Toast Notification System to All Views

Toast notifications are a dependency for all export features (feedback messages like "Link copied!", "Downloading...").

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`

Note: `dynamic-visual.html` already has a `showToast()` function (used by PNG/SVG download). The list and analysis pages need one added. All three should use a consistent implementation.

- [ ] **Step 1: Add toast CSS and JS to `dynamic-list.html`**

Add before the closing `</style>` tag (after the existing CSS, around line 333):

```css
/* Toast notifications */
.toast-container { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
.toast { background: rgba(15, 23, 42, 0.95); color: #e2e8f0; padding: 12px 24px; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 1px solid rgba(99,102,241,0.3); animation: toastIn 0.3s ease; pointer-events: auto; }
@keyframes toastIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.toast.fade-out { animation: toastOut 0.3s ease forwards; }
@keyframes toastOut { to { opacity: 0; transform: translateY(12px); } }
```

Add after the opening `<body>` tag:

```html
<div class="toast-container" id="toastContainer"></div>
```

Add inside the `<script>` block (at the top of JS, before other functions):

```javascript
function showToast(msg, duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}
```

- [ ] **Step 2: Add the same toast CSS and JS to `dynamic-analysis.html`**

Same CSS before closing `</style>` (around line 236), same `<div id="toastContainer">` after `<body>`, same `showToast()` function at the top of the `<script>` block.

- [ ] **Step 3: Verify `dynamic-visual.html` has compatible toast**

The visual page already has `showToast()` (used by PNG/SVG download). Read the existing implementation to confirm it uses the same pattern. If it differs, align it with the pattern above. The existing toast in visual.html uses inline styles — update it to use the CSS class pattern for consistency.

- [ ] **Step 4: Test toasts manually**

Start the dev server and open each page. In the browser console, run `showToast('Test notification')` on each page to verify the toast appears and auto-dismisses.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html
git commit -m "feat: add toast notification system to all views"
```

---

### Task 2: Add Export Dropdown UI to All Views

Add the Export/Share dropdown button to the navigation bar of all three views.

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`

- [ ] **Step 1: Add export dropdown CSS to `dynamic-list.html`**

Add before the closing `</style>` tag (after the toast CSS from Task 1):

```css
/* Export dropdown */
.export-wrapper { position: relative; display: inline-block; }
.export-btn { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.export-btn:hover { background: linear-gradient(135deg, #818cf8, #6366f1); }
.export-btn .arrow { font-size: 10px; transition: transform 0.2s; }
.export-wrapper.open .export-btn .arrow { transform: rotate(180deg); }
.export-menu { display: none; position: absolute; right: 0; top: calc(100% + 6px); background: #1e293b; border: 1px solid #334155; border-radius: 10px; min-width: 220px; box-shadow: 0 8px 30px rgba(0,0,0,0.4); z-index: 1000; overflow: hidden; }
.export-wrapper.open .export-menu { display: block; }
.export-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 16px; background: none; border: none; color: #e2e8f0; font-size: 14px; cursor: pointer; text-align: left; }
.export-menu button:hover { background: #334155; }
.export-menu button .icon { width: 20px; text-align: center; font-size: 16px; }
.export-menu hr { border: none; border-top: 1px solid #334155; margin: 4px 0; }
```

- [ ] **Step 2: Add export dropdown HTML to `dynamic-list.html` nav bar**

The nav bar is around line 742. Add the export dropdown alongside the existing nav buttons:

```html
<div class="export-wrapper" id="exportWrapper">
    <button class="export-btn" onclick="document.getElementById('exportWrapper').classList.toggle('open')">
        <span>Export / Share</span><span class="arrow">▼</span>
    </button>
    <div class="export-menu">
        <button onclick="shareLink()"><span class="icon">🔗</span> Share Link</button>
        <button onclick="downloadHTML()"><span class="icon">📄</span> Download HTML</button>
        <button onclick="downloadPDF()"><span class="icon">📑</span> Download PDF</button>
        <button onclick="downloadMarkdown()"><span class="icon">📝</span> Download Markdown</button>
    </div>
</div>
```

- [ ] **Step 3: Add click-outside-to-close JS to `dynamic-list.html`**

Add inside the `<script>` block:

```javascript
document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('exportWrapper');
    if (wrapper && !wrapper.contains(e.target)) wrapper.classList.remove('open');
});
```

- [ ] **Step 4: Add same export dropdown CSS, HTML, and JS to `dynamic-analysis.html`**

Same CSS, same dropdown HTML in the nav bar (around line 646), same click-outside handler. The analysis page gets the same 4 options (Share Link, HTML, PDF, Markdown).

- [ ] **Step 5: Add export dropdown to `dynamic-visual.html`**

The visual page nav bar is around line 751. Add the same dropdown but with 2 extra options for PNG and SVG. Note: the visual page already has separate download buttons for PNG/SVG — keep those working but also add them to the unified dropdown:

```html
<div class="export-wrapper" id="exportWrapper">
    <button class="export-btn" onclick="document.getElementById('exportWrapper').classList.toggle('open')">
        <span>Export / Share</span><span class="arrow">▼</span>
    </button>
    <div class="export-menu">
        <button onclick="shareLink()"><span class="icon">🔗</span> Share Link</button>
        <button onclick="downloadHTML()"><span class="icon">📄</span> Download HTML</button>
        <button onclick="downloadPDF()"><span class="icon">📑</span> Download PDF</button>
        <button onclick="downloadMarkdown()"><span class="icon">📝</span> Download Markdown</button>
        <hr>
        <button onclick="downloadPNG()"><span class="icon">🖼️</span> Download PNG</button>
        <button onclick="downloadSVG()"><span class="icon">📐</span> Download SVG</button>
    </div>
</div>
```

Add the same CSS and click-outside handler.

- [ ] **Step 6: Add stub functions to all three pages**

In each page's `<script>`, add stubs so the buttons don't error before features are implemented:

```javascript
function shareLink() { showToast('Share Link — coming soon'); }
function downloadHTML() { showToast('HTML export — coming soon'); }
function downloadPDF() { showToast('PDF export — coming soon'); }
function downloadMarkdown() { showToast('Markdown export — coming soon'); }
```

(The visual page already has `downloadPNG()` and `downloadSVG()` — don't stub those.)

- [ ] **Step 7: Test the dropdown UI**

Start the dev server, load a schema, verify the dropdown opens/closes on all three pages, and that clicking each option shows the "coming soon" toast.

- [ ] **Step 8: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html
git commit -m "feat: add export/share dropdown UI to all views"
```

---

### Task 3: Implement Share Link

Compress schema data, encode in URL hash, copy to clipboard.

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`
- Modify: `public/index.html`

- [ ] **Step 1: Implement `shareLink()` in `dynamic-list.html`**

Replace the stub `shareLink()` function:

```javascript
async function shareLink() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }

    try {
        let encoded;
        if (typeof CompressionStream !== 'undefined') {
            const blob = new Blob([raw]);
            const cs = new CompressionStream('gzip');
            const compressedStream = blob.stream().pipeThrough(cs);
            const compressedBlob = await new Response(compressedStream).blob();
            const buffer = await compressedBlob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            encoded = 'gz:' + btoa(binary);
        } else {
            encoded = 'raw:' + btoa(unescape(encodeURIComponent(raw)));
        }

        if (encoded.length > 100000) {
            showToast('Schema too large for URL sharing — use HTML export instead', 5000);
            return;
        }

        const url = window.location.origin + '/#data=' + encodeURIComponent(encoded);
        await navigator.clipboard.writeText(url);
        showToast('Share link copied to clipboard!');
    } catch (err) {
        showToast('Failed to generate share link: ' + err.message);
    }
}
```

- [ ] **Step 2: Copy the same `shareLink()` to `dynamic-visual.html` and `dynamic-analysis.html`**

Replace the stub in both files with the identical function from Step 1.

- [ ] **Step 3: Add hash detection to `index.html`**

Add at the top of the `<script>` block in `index.html` (before other code), so it runs on page load:

```javascript
(async function checkShareHash() {
    const hash = window.location.hash;
    if (!hash.startsWith('#data=')) return;

    const encoded = decodeURIComponent(hash.slice(6));
    try {
        let json;
        if (encoded.startsWith('gz:')) {
            const binary = atob(encoded.slice(3));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes]);
            const ds = new DecompressionStream('gzip');
            const decompressedStream = blob.stream().pipeThrough(ds);
            json = await new Response(decompressedStream).text();
        } else if (encoded.startsWith('raw:')) {
            json = decodeURIComponent(escape(atob(encoded.slice(4))));
        } else {
            return;
        }

        // Validate it's proper schema data
        const data = JSON.parse(json);
        if (!data.schema) return;

        sessionStorage.setItem('dbdiagram_data', json);
        window.location.href = '/dynamic-list.html';
    } catch (err) {
        console.error('Failed to load shared schema:', err);
    }
})();
```

- [ ] **Step 4: Test the share link flow**

1. Load a schema via the connection form or SQL paste.
2. On the list view, click Export/Share → Share Link.
3. Verify toast says "Share link copied to clipboard!".
4. Open a new tab, paste the URL.
5. Verify it redirects to the list view with the schema loaded.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html public/index.html
git commit -m "feat: implement shareable URL with gzip compression"
```

---

### Task 4: Implement Markdown Export

Generate GitHub-Flavored Markdown from schema JSON.

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`

- [ ] **Step 1: Implement `downloadMarkdown()` in `dynamic-list.html`**

Replace the stub:

```javascript
function downloadMarkdown() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }
    const data = JSON.parse(raw);
    const schema = data.schema;
    const dbName = data.database || 'Database';
    const version = data.version || '';
    const tableCount = Object.keys(schema).length;
    const date = new Date().toISOString().split('T')[0];

    const { categories, tableCategory } = autoCategorize(schema);

    let md = `# Database Schema: ${dbName}\n`;
    md += `> Generated on ${date} | ${tableCount} tables | ${version}\n\n`;

    // Table of contents
    md += `## Table of Contents\n`;
    for (const [cat, tables] of Object.entries(categories)) {
        md += `- **${cat}**\n`;
        for (const t of tables) md += `  - [${t}](#${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')})\n`;
    }
    md += `\n---\n\n`;

    // Table details by category
    for (const [cat, tables] of Object.entries(categories)) {
        md += `## ${cat}\n\n`;
        for (const t of tables) {
            const tbl = schema[t];
            if (!tbl) continue;
            md += `### ${t}\n\n`;
            md += `| Column | Type | Nullable | Key |\n`;
            md += `|--------|------|----------|-----|\n`;
            for (const col of tbl.columns) {
                const isPK = tbl.primary_keys.includes(col.name);
                const isFK = tbl.foreign_keys.some(fk => fk.columns.includes(col.name));
                const key = isPK ? 'PK' : isFK ? 'FK' : '';
                md += `| ${col.name} | ${col.type} | ${col.nullable ? 'YES' : 'NO'} | ${key} |\n`;
            }
            md += `\n`;
            if (tbl.keys.length > 0) {
                md += `**Indexes:**\n`;
                for (const k of tbl.keys) {
                    md += `- ${k.name} (${k.columns.join(', ')})${k.unique ? ' UNIQUE' : ''}\n`;
                }
                md += `\n`;
            }
            if (tbl.foreign_keys.length > 0) {
                md += `**Foreign Keys:**\n`;
                for (const fk of tbl.foreign_keys) {
                    md += `- \`${fk.columns.join(', ')}\` → \`${fk.ref_table}.${fk.ref_columns.join(', ')}\``;
                    if (fk.actions) md += ` (${fk.actions})`;
                    md += `\n`;
                }
                md += `\n`;
            }
            md += `---\n\n`;
        }
    }

    // Schema analysis summary
    md += generateAnalysisSummaryMd(schema);

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schema-${dbName.replace(/[^a-zA-Z0-9]/g, '_')}-${date}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Markdown downloaded!');
}

function generateAnalysisSummaryMd(schema) {
    // Lightweight analysis inline — just the grade and top-level counts
    let errors = 0, warnings = 0;
    for (const [name, tbl] of Object.entries(schema)) {
        if (tbl.primary_keys.length === 0) errors++;
        for (const fk of tbl.foreign_keys) {
            if (!schema[fk.ref_table] && !schema[fk.ref_table?.toLowerCase()]) errors++;
        }
        if (tbl.columns.length > 30) warnings++;
        const hasFKIn = Object.values(schema).some(t => t.foreign_keys.some(f => f.ref_table === name || f.ref_table === name.toLowerCase()));
        const hasFKOut = tbl.foreign_keys.length > 0;
        if (!hasFKIn && !hasFKOut) warnings++;
    }
    const score = Math.max(0, 100 - errors * 15 - warnings * 5);
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 40) grade = 'D';

    let md = `## Schema Analysis Summary\n\n`;
    md += `**Grade: ${grade}** (Score: ${score}/100)\n\n`;
    md += `- ${errors} error(s) found\n`;
    md += `- ${warnings} warning(s) found\n`;
    return md;
}
```

- [ ] **Step 2: Copy `downloadMarkdown()` and `generateAnalysisSummaryMd()` to `dynamic-visual.html` and `dynamic-analysis.html`**

Replace the stubs in both files with the identical functions. Both pages also have access to `autoCategorize()` (visual has its own copy, analysis doesn't — for analysis, generate without categories by iterating `Object.entries(schema)` directly instead of by category).

For `dynamic-analysis.html`, since it doesn't have `autoCategorize()`, use a simpler version that lists tables alphabetically without category grouping:

```javascript
function downloadMarkdown() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }
    const data = JSON.parse(raw);
    const schema = data.schema;
    const dbName = data.database || 'Database';
    const version = data.version || '';
    const tableCount = Object.keys(schema).length;
    const date = new Date().toISOString().split('T')[0];

    let md = `# Database Schema: ${dbName}\n`;
    md += `> Generated on ${date} | ${tableCount} tables | ${version}\n\n`;

    md += `## Tables\n\n`;
    for (const [t, tbl] of Object.entries(schema).sort((a, b) => a[0].localeCompare(b[0]))) {
        md += `### ${t}\n\n`;
        md += `| Column | Type | Nullable | Key |\n`;
        md += `|--------|------|----------|-----|\n`;
        for (const col of tbl.columns) {
            const isPK = tbl.primary_keys.includes(col.name);
            const isFK = tbl.foreign_keys.some(fk => fk.columns.includes(col.name));
            const key = isPK ? 'PK' : isFK ? 'FK' : '';
            md += `| ${col.name} | ${col.type} | ${col.nullable ? 'YES' : 'NO'} | ${key} |\n`;
        }
        md += `\n`;
        if (tbl.keys.length > 0) {
            md += `**Indexes:**\n`;
            for (const k of tbl.keys) md += `- ${k.name} (${k.columns.join(', ')})${k.unique ? ' UNIQUE' : ''}\n`;
            md += `\n`;
        }
        if (tbl.foreign_keys.length > 0) {
            md += `**Foreign Keys:**\n`;
            for (const fk of tbl.foreign_keys) {
                md += `- \`${fk.columns.join(', ')}\` → \`${fk.ref_table}.${fk.ref_columns.join(', ')}\``;
                if (fk.actions) md += ` (${fk.actions})`;
                md += `\n`;
            }
            md += `\n`;
        }
        md += `---\n\n`;
    }

    md += generateAnalysisSummaryMd(schema);

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schema-${dbName.replace(/[^a-zA-Z0-9]/g, '_')}-${date}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Markdown downloaded!');
}
```

- [ ] **Step 3: Test Markdown export**

Load a schema, click Export → Download Markdown on each page. Open the `.md` file and verify it renders correctly in a markdown viewer or GitHub.

- [ ] **Step 4: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html
git commit -m "feat: implement markdown schema documentation export"
```

---

### Task 5: Implement Self-Contained HTML Export

Build a standalone interactive HTML viewer as a single downloadable file.

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`

- [ ] **Step 1: Implement `downloadHTML()` in `dynamic-list.html`**

Replace the stub. This is a large function that builds a complete HTML document as a string:

```javascript
function downloadHTML() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }
    showToast('Generating HTML...');
    const data = JSON.parse(raw);
    const schema = data.schema;
    const dbName = data.database || 'Database';
    const version = data.version || '';
    const tableCount = Object.keys(schema).length;
    const date = new Date().toISOString().split('T')[0];
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    // Inline the categorization results
    const { categories, categoryColors, tableCategory } = autoCategorize(schema);

    // Count FKs
    let fkCount = 0;
    let colCount = 0;
    for (const tbl of Object.values(schema)) {
        fkCount += tbl.foreign_keys.length;
        colCount += tbl.columns.length;
    }

    // Build category filter buttons HTML
    let filterBtns = `<button class="filter-btn active" onclick="filterCat('all')">All (${tableCount})</button>`;
    for (const [cat, tables] of Object.entries(categories)) {
        const colors = categoryColors[cat] || { bg: '#1e293b', border: '#334155' };
        filterBtns += `<button class="filter-btn" style="border-color:${colors.border}" onclick="filterCat('${esc(cat)}')">${esc(cat)} (${tables.length})</button>`;
    }

    // Build table cards HTML
    let cardsHTML = '';
    for (const [cat, tables] of Object.entries(categories)) {
        const colors = categoryColors[cat] || { bg: '#1e293b', border: '#334155', header: '#334155', headerText: '#e2e8f0' };
        for (const t of tables) {
            const tbl = schema[t];
            if (!tbl) continue;
            let colsHTML = '';
            for (const col of tbl.columns) {
                const isPK = tbl.primary_keys.includes(col.name);
                const isFK = tbl.foreign_keys.some(fk => fk.columns.includes(col.name));
                const icon = isPK ? '🔑' : isFK ? '🔗' : '◦';
                colsHTML += `<tr><td>${icon}</td><td>${esc(col.name)}</td><td class="col-type">${esc(col.type)}</td><td>${col.nullable ? 'NULL' : 'NOT NULL'}</td></tr>`;
            }
            let fksHTML = '';
            if (tbl.foreign_keys.length > 0) {
                fksHTML = '<div class="fk-section">';
                for (const fk of tbl.foreign_keys) {
                    fksHTML += `<div class="fk-row">${esc(fk.columns.join(', '))} → ${esc(fk.ref_table)}.${esc(fk.ref_columns.join(', '))}</div>`;
                }
                fksHTML += '</div>';
            }
            cardsHTML += `<div class="table-card" data-category="${esc(cat)}" style="border-color:${colors.border}">
                <div class="card-header" style="background:${colors.header};color:${colors.headerText}" onclick="this.parentElement.classList.toggle('collapsed')">
                    <span>${esc(t)}</span><span class="col-count">${tbl.columns.length} cols</span>
                </div>
                <div class="card-body"><table>${colsHTML}</table>${fksHTML}</div>
            </div>`;
        }
    }

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(dbName)} — Schema Documentation</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:20px}
.header{text-align:center;padding:20px 0 16px;border-bottom:1px solid #1e293b;margin-bottom:20px}
.header h1{font-size:24px;color:#f8fafc}.header .meta{color:#94a3b8;font-size:14px;margin-top:6px}
.stats{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:16px 0}
.stat{background:#1e293b;padding:8px 16px;border-radius:8px;font-size:13px;color:#94a3b8}
.stat b{color:#e2e8f0}
.search{display:block;width:100%;max-width:500px;margin:16px auto;padding:10px 16px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:14px;outline:none}
.search:focus{border-color:#6366f1}
.filters{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:12px 0 20px}
.filter-btn{background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:6px 14px;border-radius:20px;cursor:pointer;font-size:12px}
.filter-btn:hover,.filter-btn.active{background:#334155;color:#e2e8f0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:16px}
.table-card{border:1px solid #334155;border-radius:10px;overflow:hidden;background:#1e293b}
.card-header{padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:14px}
.col-count{font-weight:400;font-size:12px;opacity:0.7}
.collapsed .card-body{display:none}
.card-body table{width:100%;border-collapse:collapse;font-size:13px}
.card-body tr{border-top:1px solid #0f172a}
.card-body td{padding:5px 10px;vertical-align:top}
.col-type{color:#818cf8;font-family:monospace;font-size:12px}
.fk-section{padding:8px 10px;border-top:1px solid #0f172a;font-size:12px;color:#94a3b8}
.fk-row{padding:2px 0}
.footer{text-align:center;color:#475569;font-size:12px;margin-top:30px;padding-top:16px;border-top:1px solid #1e293b}
</style></head><body>
<div class="header"><h1>${esc(dbName)}</h1><div class="meta">${esc(version)} — Schema Documentation</div></div>
<div class="stats"><div class="stat"><b>${tableCount}</b> tables</div><div class="stat"><b>${colCount}</b> columns</div><div class="stat"><b>${fkCount}</b> foreign keys</div><div class="stat"><b>${Object.keys(categories).length}</b> categories</div></div>
<input class="search" id="search" placeholder="Search tables and columns..." oninput="filterSearch(this.value)">
<div class="filters">${filterBtns}</div>
<div class="grid" id="grid">${cardsHTML}</div>
<div class="footer">Generated by DatabaseDiagram on ${date}</div>
<script>
function filterCat(cat){
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.table-card').forEach(c=>{c.style.display=(cat==='all'||c.dataset.category===cat)?'':'none'});
}
function filterSearch(q){
  q=q.toLowerCase();
  document.querySelectorAll('.table-card').forEach(c=>{c.style.display=c.textContent.toLowerCase().includes(q)?'':'none'});
}
</script></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schema-${dbName.replace(/[^a-zA-Z0-9]/g, '_')}-${date}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('HTML downloaded!');
}
```

- [ ] **Step 2: Copy `downloadHTML()` to `dynamic-visual.html`**

Replace the stub. The visual page also has `autoCategorize()`, so the identical function works.

- [ ] **Step 3: Add `downloadHTML()` to `dynamic-analysis.html`**

The analysis page doesn't have `autoCategorize()`. Use a simplified version that skips category grouping — set `categories = { 'All Tables': Object.keys(schema).sort() }` and `categoryColors = { 'All Tables': { bg: '#1e293b', border: '#334155', header: '#334155', headerText: '#e2e8f0' } }` at the top of the function instead of calling `autoCategorize()`. The rest of the function is identical.

- [ ] **Step 4: Test HTML export**

Export from each page. Open the downloaded `.html` file directly in a browser (no server). Verify: tables render, search works, category filters work, collapsible cards work.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html
git commit -m "feat: implement self-contained HTML schema export"
```

---

### Task 6: Implement PDF Export

Open a print-optimized layout and trigger `window.print()`.

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`

- [ ] **Step 1: Implement `downloadPDF()` in `dynamic-list.html`**

Replace the stub:

```javascript
function downloadPDF() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (!raw) { showToast('No schema data loaded'); return; }
    showToast('Preparing PDF...');
    const data = JSON.parse(raw);
    const schema = data.schema;
    const dbName = data.database || 'Database';
    const version = data.version || '';
    const tableCount = Object.keys(schema).length;
    const date = new Date().toISOString().split('T')[0];
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    const { categories } = autoCategorize(schema);

    // Build table of contents
    let toc = '';
    for (const [cat, tables] of Object.entries(categories)) {
        toc += `<div class="toc-cat">${esc(cat)}</div>`;
        for (const t of tables) toc += `<div class="toc-table">${esc(t)}</div>`;
    }

    // Build table detail sections
    let details = '';
    for (const [cat, tables] of Object.entries(categories)) {
        details += `<h2 class="cat-heading">${esc(cat)}</h2>`;
        for (const t of tables) {
            const tbl = schema[t];
            if (!tbl) continue;
            details += `<div class="table-section"><h3>${esc(t)}</h3><table><thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>Key</th></tr></thead><tbody>`;
            for (const col of tbl.columns) {
                const isPK = tbl.primary_keys.includes(col.name);
                const isFK = tbl.foreign_keys.some(fk => fk.columns.includes(col.name));
                const key = isPK ? 'PK' : isFK ? 'FK' : '';
                details += `<tr><td>${esc(col.name)}</td><td class="mono">${esc(col.type)}</td><td>${col.nullable ? 'YES' : 'NO'}</td><td>${key}</td></tr>`;
            }
            details += `</tbody></table>`;
            if (tbl.foreign_keys.length > 0) {
                details += `<div class="fk-list"><strong>Foreign Keys:</strong>`;
                for (const fk of tbl.foreign_keys) details += `<div>${esc(fk.columns.join(', '))} → ${esc(fk.ref_table)}.${esc(fk.ref_columns.join(', '))}</div>`;
                details += `</div>`;
            }
            details += `</div>`;
        }
    }

    // Build FK summary table
    let fkSummary = '<table><thead><tr><th>Table</th><th>Column</th><th>References</th><th>Actions</th></tr></thead><tbody>';
    for (const [t, tbl] of Object.entries(schema)) {
        for (const fk of tbl.foreign_keys) {
            fkSummary += `<tr><td>${esc(t)}</td><td>${esc(fk.columns.join(', '))}</td><td>${esc(fk.ref_table)}.${esc(fk.ref_columns.join(', '))}</td><td>${esc(fk.actions || '')}</td></tr>`;
        }
    }
    fkSummary += '</tbody></table>';

    const printHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${esc(dbName)} — Schema Report</title>
<style>
@page{size:A4;margin:20mm 15mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;font-size:11px;line-height:1.4}
.cover{text-align:center;padding:60px 0 40px;border-bottom:2px solid #e2e8f0;margin-bottom:30px}
.cover h1{font-size:28px;color:#0f172a}.cover .meta{color:#64748b;font-size:14px;margin-top:8px}
.cover .stats{margin-top:16px;font-size:13px;color:#475569}
.toc{margin-bottom:30px;break-after:page}
.toc h2{font-size:16px;margin-bottom:12px;color:#0f172a}
.toc-cat{font-weight:600;margin-top:8px;color:#334155}.toc-table{margin-left:20px;color:#64748b}
.cat-heading{font-size:16px;color:#0f172a;margin:20px 0 10px;padding-top:10px;border-top:2px solid #e2e8f0;break-before:page}
.cat-heading:first-of-type{break-before:auto}
.table-section{margin-bottom:16px;break-inside:avoid}
.table-section h3{font-size:13px;color:#1e293b;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10px}
th{background:#f1f5f9;text-align:left;padding:4px 8px;border:1px solid #e2e8f0;font-weight:600}
td{padding:3px 8px;border:1px solid #e2e8f0}
.mono{font-family:Consolas,monospace;font-size:10px;color:#6366f1}
.fk-list{font-size:10px;color:#64748b;margin-bottom:8px}
.fk-list div{margin-left:8px}
h2.section-heading{font-size:16px;margin:24px 0 10px;break-before:page}
.footer{text-align:center;color:#94a3b8;font-size:9px;margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="cover"><h1>${esc(dbName)}</h1><div class="meta">Database Schema Report</div>
<div class="stats">${version} — ${tableCount} tables — Generated ${date}</div></div>
<div class="toc"><h2>Table of Contents</h2>${toc}</div>
${details}
<h2 class="section-heading">Relationship Summary</h2>
${fkSummary}
<div class="footer">Generated by DatabaseDiagram on ${date}</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(printHTML);
    w.document.close();
}
```

- [ ] **Step 2: Copy `downloadPDF()` to `dynamic-visual.html`**

Identical function (visual page also has `autoCategorize()`).

- [ ] **Step 3: Add `downloadPDF()` to `dynamic-analysis.html`**

Same approach as HTML export — replace `autoCategorize()` call with `{ 'All Tables': Object.keys(schema).sort() }`. Rest is identical.

- [ ] **Step 4: Test PDF export**

Click Export → Download PDF. Verify the print dialog opens with a well-formatted document. Check page breaks, table formatting, and the cover page.

- [ ] **Step 5: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html
git commit -m "feat: implement PDF export via print-optimized layout"
```

---

### Task 7: Enhanced SVG Export with Metadata

Add footer bar and embedded schema JSON to SVG export.

**Files:**
- Modify: `public/dynamic-visual.html`

- [ ] **Step 1: Modify `downloadSVG()` in `dynamic-visual.html`**

Locate the existing `downloadSVG()` function. Modify it to add:

1. A footer `<g>` element at the bottom of the SVG with database name, table count, and date.
2. A `<metadata>` element containing the full schema JSON.

After the SVG closing content is built (just before the `</svg>` tag is appended), insert:

```javascript
// Add footer bar
const footerY = maxY + 30;
svg += `<rect x="${minX}" y="${footerY}" width="${w}" height="30" fill="#1e293b"/>\n`;
svg += `<text x="${minX + 12}" y="${footerY + 20}" fill="#94a3b8" font-size="11">${esc(window._dbName || 'Database')} — ${Object.keys(window._schema || {}).length} tables — Generated ${new Date().toISOString().split('T')[0]} — DatabaseDiagram</text>\n`;

// Embed schema metadata for re-import
const schemaJSON = sessionStorage.getItem('dbdiagram_data') || '';
svg += `<metadata><dbdiagram-schema>${schemaJSON.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</dbdiagram-schema></metadata>\n`;
```

Also update the SVG height to account for the footer: change `h` to `h + 40` in the viewBox and SVG height attribute.

- [ ] **Step 2: Update the filename**

Change the download filename from the current pattern to:

```javascript
const date = new Date().toISOString().split('T')[0];
a.download = `schema-${(window._dbName || 'database').replace(/[^a-zA-Z0-9]/g, '_')}-${date}.svg`;
```

- [ ] **Step 3: Test SVG export**

Export an SVG, open it in a text editor, verify the `<metadata>` element contains the schema JSON and the footer text is visible at the bottom.

- [ ] **Step 4: Commit**

```bash
git add public/dynamic-visual.html
git commit -m "feat: enhance SVG export with footer and embedded schema metadata"
```

---

### Task 8: Enhanced PNG Export with Metadata

Add footer bar and embed schema JSON in PNG tEXt chunk.

**Files:**
- Modify: `public/dynamic-visual.html`

- [ ] **Step 1: Add PNG tEXt chunk insertion helper**

Add this utility function in the `<script>` block of `dynamic-visual.html`:

```javascript
function insertPNGTextChunk(pngBlob, keyword, text) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const data = new Uint8Array(reader.result);

            // Build tEXt chunk: keyword + null separator + text
            const keyBytes = new TextEncoder().encode(keyword);
            const textBytes = new TextEncoder().encode(text);
            const chunkData = new Uint8Array(keyBytes.length + 1 + textBytes.length);
            chunkData.set(keyBytes, 0);
            chunkData[keyBytes.length] = 0; // null separator
            chunkData.set(textBytes, keyBytes.length + 1);

            // Calculate CRC32 of chunk type + data
            const chunkType = new Uint8Array([0x74, 0x45, 0x58, 0x74]); // "tEXt"
            const crcInput = new Uint8Array(chunkType.length + chunkData.length);
            crcInput.set(chunkType, 0);
            crcInput.set(chunkData, chunkType.length);
            const crc = crc32(crcInput);

            // Build full chunk: length (4 bytes) + type (4 bytes) + data + CRC (4 bytes)
            const chunk = new Uint8Array(12 + chunkData.length);
            const view = new DataView(chunk.buffer);
            view.setUint32(0, chunkData.length);
            chunk.set(chunkType, 4);
            chunk.set(chunkData, 8);
            view.setUint32(8 + chunkData.length, crc);

            // Insert before IEND (last 12 bytes of PNG)
            const result = new Uint8Array(data.length + chunk.length);
            result.set(data.subarray(0, data.length - 12), 0);
            result.set(chunk, data.length - 12);
            result.set(data.subarray(data.length - 12), data.length - 12 + chunk.length);

            resolve(new Blob([result], { type: 'image/png' }));
        };
        reader.readAsArrayBuffer(pngBlob);
    });
}

function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
```

- [ ] **Step 2: Modify `downloadPNG()` to add footer and metadata**

In the existing `downloadPNG()` function, after drawing all tables but before `c.toBlob()`:

```javascript
// Draw footer bar
const footerY = maxY + 20;
ctx.fillStyle = '#1e293b';
ctx.fillRect(minX, footerY, cw, 30);
ctx.fillStyle = '#94a3b8';
ctx.font = '11px Segoe UI, sans-serif';
const date = new Date().toISOString().split('T')[0];
ctx.fillText(`${window._dbName || 'Database'} — ${Object.keys(window._schema || {}).length} tables — Generated ${date} — DatabaseDiagram`, minX + 12, footerY + 20);
```

Update the canvas height to accommodate the footer: add `+ 60` to `ch` calculation.

Then modify the `c.toBlob()` callback to insert the metadata:

```javascript
c.toBlob(async (blob) => {
    const schemaJSON = sessionStorage.getItem('dbdiagram_data') || '';
    const enhancedBlob = await insertPNGTextChunk(blob, 'DatabaseDiagram', schemaJSON);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(enhancedBlob);
    a.download = `schema-${(window._dbName || 'database').replace(/[^a-zA-Z0-9]/g, '_')}-${date}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('PNG downloaded!');
}, 'image/png');
```

- [ ] **Step 3: Test PNG export**

Export a PNG. Verify the footer is visible at the bottom of the image. To verify metadata, use a PNG metadata viewer or read the file as ArrayBuffer in the browser console and search for the "DatabaseDiagram" string.

- [ ] **Step 4: Commit**

```bash
git add public/dynamic-visual.html
git commit -m "feat: enhance PNG export with footer and embedded schema metadata"
```

---

### Task 9: Image Re-Import on Index Page

Accept PNG and SVG files in the drag-and-drop zone and extract embedded schema metadata.

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add PNG metadata extraction function**

Add in the `<script>` block of `index.html`:

```javascript
function extractPNGMetadata(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    let offset = 8; // Skip PNG signature
    while (offset < data.length) {
        const view = new DataView(data.buffer, offset);
        const length = view.getUint32(0);
        const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
        if (type === 'tEXt') {
            const chunkData = data.subarray(offset + 8, offset + 8 + length);
            // Find null separator between keyword and text
            let nullIdx = 0;
            while (nullIdx < chunkData.length && chunkData[nullIdx] !== 0) nullIdx++;
            const keyword = new TextDecoder().decode(chunkData.subarray(0, nullIdx));
            if (keyword === 'DatabaseDiagram') {
                return new TextDecoder().decode(chunkData.subarray(nullIdx + 1));
            }
        }
        if (type === 'IEND') break;
        offset += 12 + length; // 4 (length) + 4 (type) + data + 4 (CRC)
    }
    return null;
}
```

- [ ] **Step 2: Add SVG metadata extraction function**

```javascript
function extractSVGMetadata(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const metaEl = doc.querySelector('metadata dbdiagram-schema');
    if (metaEl) return metaEl.textContent;
    return null;
}
```

- [ ] **Step 3: Modify the file input change handler**

Locate the existing `fileInput.addEventListener('change', ...)` handler (around line 562). Modify it to detect file type and handle PNG/SVG:

```javascript
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileName.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    uploadArea.classList.add('has-file');

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'png') {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const json = extractPNGMetadata(ev.target.result);
            if (json) {
                try {
                    const data = JSON.parse(json);
                    if (data.schema) {
                        sessionStorage.setItem('dbdiagram_data', json);
                        window.location.href = '/dynamic-list.html';
                        return;
                    }
                } catch (e) {}
            }
            showError('This PNG does not contain DatabaseDiagram schema data. Only images exported from this tool can be re-imported.');
        };
        reader.readAsArrayBuffer(file);
    } else if (ext === 'svg') {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const json = extractSVGMetadata(ev.target.result);
            if (json) {
                try {
                    const data = JSON.parse(json);
                    if (data.schema) {
                        sessionStorage.setItem('dbdiagram_data', json);
                        window.location.href = '/dynamic-list.html';
                        return;
                    }
                } catch (e) {}
            }
            showError('This SVG does not contain DatabaseDiagram schema data. Only images exported from this tool can be re-imported.');
        };
        reader.readAsText(file);
    } else {
        // Existing SQL file handling
        const reader = new FileReader();
        reader.onload = (ev) => { uploadedSQL = ev.target.result; };
        reader.readAsText(file);
    }
});
```

Where `showError` is the existing error display function in `index.html` (find the pattern used for connection errors and reuse it).

- [ ] **Step 4: Update the file input accept attribute**

Find the file `<input>` element for the upload area and update its `accept` attribute to include image types:

```html
<input type="file" id="fileInput" accept=".sql,.png,.svg" hidden>
```

Also update any instructional text in the drag-and-drop area to mention image files:

```html
<p>Drop a .sql, .png, or .svg file here</p>
```

- [ ] **Step 5: Add a toast system to `index.html`**

The index page doesn't have toasts yet. Add the same toast CSS and HTML from Task 1, plus add the `showToast()` function, so re-import success can show feedback.

- [ ] **Step 6: Test the full round-trip**

1. Load a schema, go to visual diagram, export as SVG.
2. Go back to index page, drag the exported SVG onto the upload area.
3. Verify it loads the schema and redirects to the list view.
4. Repeat with PNG export.
5. Try dragging a regular PNG (no metadata) and verify the error message appears.

- [ ] **Step 7: Commit**

```bash
git add public/index.html
git commit -m "feat: add PNG/SVG re-import with embedded schema metadata extraction"
```

---

### Task 10: Final Integration Test

Verify all features work together end-to-end.

**Files:** None (testing only)

- [ ] **Step 1: Test all exports from the list view**

Load a schema (SQL paste is easiest). On the list view, test each export option:
1. Share Link → paste in new tab → verify schema loads
2. Download HTML → open file → verify interactive viewer works
3. Download PDF → verify print layout, save as PDF
4. Download Markdown → open in markdown viewer

- [ ] **Step 2: Test all exports from the visual view**

Navigate to visual diagram. Test all 6 export options including enhanced PNG and SVG.

- [ ] **Step 3: Test all exports from the analysis view**

Navigate to analysis. Test all 4 export options.

- [ ] **Step 4: Test image re-import round-trip**

1. Export PNG from visual → re-import on index page → verify schema loads
2. Export SVG from visual → re-import on index page → verify schema loads
3. Drop a regular image → verify error message

- [ ] **Step 5: Test share link with large schema**

Paste a SQL dump with many tables (50+). Generate share link. Verify it works or shows the "too large" warning appropriately.

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: integration test fixes for export/sharing system"
```
