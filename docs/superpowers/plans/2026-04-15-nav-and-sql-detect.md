# Global Navigation & SQL Auto-Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-page ad-hoc nav with a unified global nav bar across all views, and add client-side SQL dialect auto-detection on the index page.

**Architecture:** The global nav bar is a consistent HTML/CSS block duplicated in each page (following the project's inline pattern). The nav replaces existing per-page nav elements and absorbs the Export/Share dropdown. SQL auto-detection is a scoring function on index.html wired to paste/upload events.

**Tech Stack:** Vanilla JavaScript (ES6), CSS3 flexbox, HTML5

**Spec:** `docs/superpowers/specs/2026-04-15-nav-and-sql-detect-design.md`

---

### Task 1: Add Global Nav Bar to `dynamic-list.html`

Replace the existing per-page nav buttons with the new unified nav bar.

**Files:**
- Modify: `public/dynamic-list.html`

- [ ] **Step 1: Add global nav bar CSS**

Replace the existing `.nav-btn` CSS (around lines 81-93) with the new global nav CSS:

```css
/* Global nav bar */
.global-nav { position: sticky; top: 0; z-index: 100; background: #0f172a; border-bottom: 1px solid #1e293b; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; height: 50px; }
.nav-left { display: flex; align-items: center; gap: 12px; }
.nav-left .app-name { color: #f8fafc; font-size: 15px; font-weight: 700; text-decoration: none; }
.nav-left .app-name:hover { color: #818cf8; }
.db-badge { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 4px 12px; font-size: 12px; color: #94a3b8; white-space: nowrap; }
.nav-center { display: flex; align-items: center; gap: 4px; }
.nav-tab { color: #94a3b8; text-decoration: none; font-size: 13px; font-weight: 500; padding: 14px 16px; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; }
.nav-tab:hover { color: #e2e8f0; }
.nav-tab.active { color: #e2e8f0; border-bottom-color: #6366f1; }
.nav-right { display: flex; align-items: center; gap: 10px; }
.nav-new-btn { border: 1px solid #334155; background: transparent; color: #94a3b8; border-radius: 8px; padding: 6px 14px; font-size: 12px; text-decoration: none; white-space: nowrap; cursor: pointer; }
.nav-new-btn:hover { border-color: #6366f1; color: #e2e8f0; }
```

- [ ] **Step 2: Replace nav HTML**

Find the existing nav buttons and Export dropdown (around lines 775-788). Replace the 3 `<a class="nav-btn">` links and the surrounding container with the new global nav bar. The Export dropdown HTML stays identical — just moves inside `.nav-right`.

The nav bar goes at the very top of the `<body>`, before any other content. The old nav buttons area should be removed entirely.

New nav bar HTML:

```html
<nav class="global-nav">
    <div class="nav-left">
        <a href="/" class="app-name">DatabaseDiagram</a>
        <span class="db-badge" id="dbBadge"></span>
    </div>
    <div class="nav-center">
        <a href="/dynamic-list.html" class="nav-tab active">Table List</a>
        <a href="/dynamic-visual.html" class="nav-tab">Visual Diagram</a>
        <a href="/dynamic-analysis.html" class="nav-tab">Analysis</a>
    </div>
    <div class="nav-right">
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
        <a href="/" class="nav-new-btn">← New Connection</a>
    </div>
</nav>
```

- [ ] **Step 3: Add database badge JS**

Add at the top of the `<script>` block (after `showToast`):

```javascript
// Populate database badge in nav
(function() {
    const raw = sessionStorage.getItem('dbdiagram_data');
    if (raw) {
        try {
            const data = JSON.parse(raw);
            const badge = document.getElementById('dbBadge');
            if (badge && data.database) {
                badge.textContent = data.database + (data.version ? ' · ' + data.version : '');
            }
        } catch(e) {}
    }
})();
```

- [ ] **Step 4: Remove old nav CSS**

Delete the old `.nav-btn` and `.nav-btn:hover` CSS rules that are no longer used.

- [ ] **Step 5: Test and commit**

Verify the page renders with the new nav bar, active tab is highlighted on "Table List", database badge shows db name, Export dropdown works, and the New Connection link goes to `/`.

```bash
git add public/dynamic-list.html
git commit -m "feat: add global nav bar to table list view"
```

---

### Task 2: Add Global Nav Bar to `dynamic-analysis.html`

**Files:**
- Modify: `public/dynamic-analysis.html`

- [ ] **Step 1: Add global nav bar CSS**

Replace the existing `.nav-bar`, `.nav-btn`, `.nav-btn.secondary` CSS (around lines 25-45) with the same global nav CSS from Task 1.

- [ ] **Step 2: Replace nav HTML**

Find the existing `.nav-bar` div (around lines 679-694). Remove it entirely and add the global nav bar HTML at the top of `<body>` (before any other content). Same HTML as Task 1 but with `active` class on the Analysis tab:

```html
<a href="/dynamic-list.html" class="nav-tab">Table List</a>
<a href="/dynamic-visual.html" class="nav-tab">Visual Diagram</a>
<a href="/dynamic-analysis.html" class="nav-tab active">Analysis</a>
```

- [ ] **Step 3: Add database badge JS**

Same JS as Task 1, added at the top of the `<script>` block.

- [ ] **Step 4: Remove old nav CSS**

Delete the old `.nav-bar`, `.nav-btn`, `.nav-btn.secondary` rules.

- [ ] **Step 5: Test and commit**

```bash
git add public/dynamic-analysis.html
git commit -m "feat: add global nav bar to analysis view"
```

---

### Task 3: Add Global Nav Bar to `dynamic-visual.html`

This is the most complex page because the nav is part of a toolbar with zoom controls.

**Files:**
- Modify: `public/dynamic-visual.html`

- [ ] **Step 1: Add global nav bar CSS**

Add the global nav CSS (same as Task 1) before the existing `.toolbar` CSS. The toolbar stays but loses its nav links — it becomes purely a tool controls bar below the nav.

- [ ] **Step 2: Add global nav bar HTML**

Add the nav bar HTML at the very top of `<body>`, BEFORE the `.toolbar` div. Same structure as Task 1 but:
- Active tab on "Visual Diagram"
- Export dropdown includes the PNG/SVG options (with `<hr>` separator)

```html
<nav class="global-nav">
    <div class="nav-left">
        <a href="/" class="app-name">DatabaseDiagram</a>
        <span class="db-badge" id="dbBadge"></span>
    </div>
    <div class="nav-center">
        <a href="/dynamic-list.html" class="nav-tab">Table List</a>
        <a href="/dynamic-visual.html" class="nav-tab active">Visual Diagram</a>
        <a href="/dynamic-analysis.html" class="nav-tab">Analysis</a>
    </div>
    <div class="nav-right">
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
        <a href="/" class="nav-new-btn">← New Connection</a>
    </div>
</nav>
```

- [ ] **Step 3: Clean up the toolbar**

Remove from the `.toolbar` div:
- The `<h1>` title (database name now in the nav badge)
- The 3 `<a class="nav-link">` elements and the `<div class="sep">` separators around them
- The Export dropdown (now in the nav bar)
- Keep: zoom controls (Zoom In, zoom level, Zoom Out, Fit All, Reset Layout)

The toolbar becomes a slim controls-only bar:

```html
<div class="toolbar">
    <button class="btn" onclick="zoomIn()">...</button>
    <span class="zoom-info" id="zoomLevel">100%</span>
    <button class="btn" onclick="zoomOut()">...</button>
    <button class="btn" onclick="zoomFit()">Fit All</button>
    <button class="btn" onclick="resetLayout()">Reset Layout</button>
</div>
```

- [ ] **Step 4: Adjust toolbar CSS**

Update the `.toolbar` top position to sit below the nav bar. Change `top: 0` to `top: 50px` so it doesn't overlap. Also remove the `.nav-link` CSS rules.

- [ ] **Step 5: Adjust canvas offset**

The canvas area currently accounts for the toolbar height. Since we added a 50px nav bar above, update any top-offset or padding calculations that position the canvas content below the toolbar. Search for references to the toolbar height and add 50px.

- [ ] **Step 6: Add database badge JS**

Same JS as Task 1.

- [ ] **Step 7: Test and commit**

Verify: nav bar at top, toolbar below it with zoom controls only, canvas renders correctly without overlap, Export dropdown works from nav bar, drag/pan still work.

```bash
git add public/dynamic-visual.html
git commit -m "feat: add global nav bar to visual diagram view"
```

---

### Task 4: Add Minimal Nav Bar to `index.html`

The index page gets a simplified version — just the app name, no tabs or export.

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add minimal nav CSS**

Add before the closing `</style>`:

```css
/* Minimal nav bar */
.global-nav { position: sticky; top: 0; z-index: 100; background: #0f172a; border-bottom: 1px solid #1e293b; padding: 0 20px; display: flex; align-items: center; height: 50px; }
.global-nav .app-name { color: #f8fafc; font-size: 15px; font-weight: 700; text-decoration: none; }
.global-nav .app-name:hover { color: #818cf8; }
```

- [ ] **Step 2: Add nav HTML**

Add at the top of `<body>` (before the existing content):

```html
<nav class="global-nav">
    <a href="/" class="app-name">DatabaseDiagram</a>
</nav>
```

- [ ] **Step 3: Test and commit**

```bash
git add public/index.html
git commit -m "feat: add minimal nav bar to index page"
```

---

### Task 5: Implement SQL Dialect Auto-Detection

Add client-side detection of SQL dialect from pasted/uploaded content.

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add the detection function**

Add in the `<script>` block (after `showToast` and the share hash detection):

```javascript
function detectSQLDialect(sql) {
    if (!sql || sql.length < 20) return 'auto';

    const scores = { mysql: 0, postgres: 0, mssql: 0 };

    // MySQL signals
    const backtickCount = (sql.match(/`[^`]+`/g) || []).length;
    scores.mysql += backtickCount;
    if (/ENGINE\s*=/i.test(sql)) scores.mysql += 2;
    if (/AUTO_INCREMENT/i.test(sql)) scores.mysql += 2;
    if (/\bUNSIGNED\b/i.test(sql)) scores.mysql += 1;
    if (/\bTINYINT\b/i.test(sql)) scores.mysql += 1;

    // PostgreSQL signals
    if (/\b(big)?serial\b/i.test(sql)) scores.postgres += 2;
    const castCount = (sql.match(/::/g) || []).length;
    scores.postgres += castCount;
    if (/WITHOUT\s+OIDS/i.test(sql)) scores.postgres += 2;
    if (/\bBOOLEAN\b/i.test(sql)) scores.postgres += 1;
    if (/\bTEXT\b/i.test(sql) && !/\bTINYTEXT\b/i.test(sql) && !/\bLONGTEXT\b/i.test(sql)) scores.postgres += 1;

    // SQL Server signals
    const bracketCount = (sql.match(/\[[^\]]+\]/g) || []).length;
    scores.mssql += bracketCount;
    if (/IDENTITY\s*\(/i.test(sql)) scores.mssql += 2;
    if (/\bGO\b/m.test(sql)) scores.mssql += 2;
    if (/\bNVARCHAR\b/i.test(sql)) scores.mssql += 1;
    if (/\bNCHAR\b/i.test(sql)) scores.mssql += 1;
    if (/\bCLUSTERED\b/i.test(sql)) scores.mssql += 1;

    // Find highest score
    let best = 'auto';
    let bestScore = 0;
    for (const [dialect, score] of Object.entries(scores)) {
        if (score > bestScore) { bestScore = score; best = dialect; }
    }

    // Require minimum confidence of 2
    return bestScore >= 2 ? best : 'auto';
}
```

- [ ] **Step 2: Add auto-detected label CSS**

Add before closing `</style>`:

```css
.auto-detected-label { color: #6366f1; font-size: 12px; margin-left: 8px; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
```

- [ ] **Step 3: Add label HTML**

Find the SQL dialect `<select>` (around line 492-497). Add a `<span>` after it for the label:

```html
<select id="sql-dialect">
    <option value="auto" selected>Auto-Detect</option>
    <option value="mysql">MySQL / MariaDB</option>
    <option value="postgres">PostgreSQL</option>
    <option value="mssql">SQL Server</option>
</select>
<span id="dialectLabel" class="auto-detected-label" style="display:none">(auto-detected)</span>
```

- [ ] **Step 4: Wire detection to paste/upload events**

Add in the `<script>` block:

```javascript
// SQL dialect auto-detection
let userOverrodeDialect = false;
let detectDebounceTimer = null;

function runDialectDetection(sql) {
    if (userOverrodeDialect) return;
    const detected = detectSQLDialect(sql);
    const select = document.getElementById('sql-dialect');
    const label = document.getElementById('dialectLabel');
    if (detected !== 'auto') {
        select.value = detected;
        label.style.display = 'inline';
        // Trigger the existing change handler so guides update
        select.dispatchEvent(new Event('change'));
    } else {
        label.style.display = 'none';
    }
}

// Debounced detection on textarea input
document.getElementById('sql-paste').addEventListener('input', function() {
    clearTimeout(detectDebounceTimer);
    const text = this.value;
    detectDebounceTimer = setTimeout(() => runDialectDetection(text), 300);
    // Reset override flag when user types new content
    userOverrodeDialect = false;
});

// Manual override detection
document.getElementById('sql-dialect').addEventListener('change', function() {
    // If this change was triggered by auto-detection, don't set override
    if (!this._autoTriggered) {
        userOverrodeDialect = true;
        document.getElementById('dialectLabel').style.display = 'none';
    }
    this._autoTriggered = false;
});
```

Then update `runDialectDetection` to set a flag before dispatching:

```javascript
function runDialectDetection(sql) {
    if (userOverrodeDialect) return;
    const detected = detectSQLDialect(sql);
    const select = document.getElementById('sql-dialect');
    const label = document.getElementById('dialectLabel');
    if (detected !== 'auto') {
        select.value = detected;
        label.style.display = 'inline';
        select._autoTriggered = true;
        select.dispatchEvent(new Event('change'));
    } else {
        label.style.display = 'none';
    }
}
```

- [ ] **Step 5: Wire detection to file upload**

Find the existing `fileInput` change handler. For `.sql` files, after `reader.onload` reads the text, add:

```javascript
reader.onload = (ev) => {
    uploadedSQL = ev.target.result;
    userOverrodeDialect = false;
    runDialectDetection(ev.target.result);
};
```

- [ ] **Step 6: Test and commit**

Test with sample SQL from each dialect:
- MySQL: paste `CREATE TABLE \`users\` ... ENGINE=InnoDB` → selector should switch to MySQL
- PostgreSQL: paste `CREATE TABLE users (id serial ...)` → selector should switch to PostgreSQL  
- SQL Server: paste `CREATE TABLE [users] (id INT IDENTITY(1,1) ...)` → selector should switch to SQL Server
- Ambiguous SQL: paste `CREATE TABLE users (id INT)` → selector should stay on Auto-Detect
- Override: auto-detect MySQL, then manually change to PostgreSQL → label disappears, no further auto-updates until new paste

```bash
git add public/index.html
git commit -m "feat: add SQL dialect auto-detection on paste and file upload"
```
