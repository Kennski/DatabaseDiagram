const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('schema.json', 'utf-8'));

// --- Collect relationships ---
const relationships = [];
for (const [tbl, def] of Object.entries(schema)) {
    for (const fk of def.foreign_keys) {
        relationships.push({
            from: tbl,
            fromCols: fk.columns,
            to: fk.ref_table,
            toCols: fk.ref_columns,
            actions: fk.actions
        });
    }
}

// --- Category definitions ---
const categories = {
    'Core Business': ['clinics', 'clinicgroup', 'groups', 'adini', 'licens', 'financetables', 'ftpsettings'],
    'Clinic Services': ['services', 'serviceaccounts', 'clinicservice', 'clinicserviceaccount', 'clinicmanualservice', 'manualservices', 'clinicmodule', 'modules', 'clinicvariablegroups', 'variablegroups'],
    'Software & Versions': ['softwarecategories', 'softwareversions', 'softwareversionpatches', 'softwarecategoryvariablegroup', 'groupsoftwarepatch', 'groupsoftwareversion', 'assets', 'downloads'],
    'Backup & Monitoring': ['backupreports', 'backupstatuses', 'backupserverinstances', 'backupservermanagementservicestatuses', 'clinicservercomments', 'clinicservermanagementservicestatuses', 'upgradings', 'datareplicationservicestatuses', 'datareplicationservicecomments'],
    'Computers': ['computers', 'computerprograms', 'computersoftwareproduct', 'computerstartups'],
    'Identity & Auth': ['aspnetusers', 'aspnetroles', 'roleclaims', 'userclaims', 'userlogins', 'userroles', 'usertokens'],
    'External Integrations': ['danmarkapi', 'danmarkapilog', 'digisenseconsumptions', 'digisensesettlements', 'speechlog', 'mysqlbackuplogs'],
    'Audit & Logs': ['audittrails', 'mydocuments'],
    'Hangfire (Job Queue)': ['hangfirejob', 'hangfirejobparameter', 'hangfirejobqueue', 'hangfirejobstate', 'hangfirestate', 'hangfireaggregatedcounter', 'hangfirecounter', 'hangfiredistributedlock', 'hangfirehash', 'hangfireset', 'hangfireserver'],
    'Legacy Job Queue': ['job', 'jobparameter', 'jobqueue', 'jobstate', 'state', 'counter', 'aggregatedcounter', 'distributedlock', 'hash', 'list', 'server', 'set'],
    'System': ['__efmigrationshistory']
};

const catColors = {
    'Core Business':      { bg: '#dbeafe', border: '#3b82f6', header: '#2563eb', text: '#1e3a5f' },
    'Clinic Services':    { bg: '#dcfce7', border: '#22c55e', header: '#16a34a', text: '#14532d' },
    'Software & Versions':{ bg: '#fef3c7', border: '#f59e0b', header: '#d97706', text: '#78350f' },
    'Backup & Monitoring':{ bg: '#fee2e2', border: '#ef4444', header: '#dc2626', text: '#7f1d1d' },
    'Computers':          { bg: '#e0e7ff', border: '#6366f1', header: '#4f46e5', text: '#312e81' },
    'Identity & Auth':    { bg: '#fce7f3', border: '#ec4899', header: '#db2777', text: '#831843' },
    'External Integrations':{ bg: '#ccfbf1', border: '#14b8a6', header: '#0d9488', text: '#134e4a' },
    'Audit & Logs':       { bg: '#f3e8ff', border: '#a855f7', header: '#9333ea', text: '#581c87' },
    'Hangfire (Job Queue)':{ bg: '#fff7ed', border: '#f97316', header: '#ea580c', text: '#7c2d12' },
    'Legacy Job Queue':   { bg: '#f1f5f9', border: '#94a3b8', header: '#64748b', text: '#1e293b' },
    'System':             { bg: '#f5f5f5', border: '#a3a3a3', header: '#737373', text: '#262626' }
};

// Build table->category map
const tableCat = {};
for (const [cat, tables] of Object.entries(categories)) {
    for (const t of tables) tableCat[t] = cat;
}
for (const t of Object.keys(schema)) {
    if (!tableCat[t]) tableCat[t] = 'System';
}

// --- Compute table box sizes ---
const BOX_W = 220;
const COL_H = 18;
const HEADER_H = 30;
const PAD = 8;

const tableBoxes = {};
for (const [name, def] of Object.entries(schema)) {
    const h = HEADER_H + def.columns.length * COL_H + PAD;
    tableBoxes[name] = { w: BOX_W, h, x: 0, y: 0, cat: tableCat[name] };
}

// --- Layout: group by category, compute actual bounds, then position without overlaps ---
const GAP_X = BOX_W + 40;  // horizontal gap between tables within a category
const GAP_Y = 30;          // vertical gap between table rows within a category
const CAT_PAD = 60;        // padding between category groups

// Step 1: lay out tables within each category (relative to 0,0) and measure bounding boxes
const catKeys = Object.keys(categories);
const catBounds = {}; // { cat: { w, h, tables: [{name, rx, ry}] } }

for (const cat of catKeys) {
    const tablesInCat = Object.entries(tableBoxes).filter(([n, b]) => b.cat === cat);
    if (tablesInCat.length === 0) continue;

    const cols = Math.ceil(Math.sqrt(tablesInCat.length));
    let col = 0, curY = 0, rowMaxH = 0;
    const positions = [];

    for (const [name, box] of tablesInCat) {
        const rx = col * GAP_X;
        const ry = curY;
        positions.push({ name, rx, ry });
        rowMaxH = Math.max(rowMaxH, box.h);
        col++;
        if (col >= cols) {
            col = 0;
            curY += rowMaxH + GAP_Y;
            rowMaxH = 0;
        }
    }
    // If last row wasn't completed, account for its height
    if (col > 0) curY += rowMaxH;

    const groupW = Math.min(tablesInCat.length, cols) * GAP_X - (GAP_X - BOX_W);
    catBounds[cat] = { w: groupW, h: curY, tables: positions };
}

// Step 2: arrange category groups on the canvas in a grid without overlaps
const activeCats = catKeys.filter(c => catBounds[c]);
const gridCols = Math.ceil(Math.sqrt(activeCats.length));

// Compute the width of each grid column and height of each grid row
const colWidths = [];
const rowHeights = [];
for (let i = 0; i < activeCats.length; i++) {
    const gc = i % gridCols;
    const gr = Math.floor(i / gridCols);
    const b = catBounds[activeCats[i]];
    colWidths[gc] = Math.max(colWidths[gc] || 0, b.w);
    rowHeights[gr] = Math.max(rowHeights[gr] || 0, b.h);
}

// Compute starting X for each grid column and Y for each grid row
const colX = [CAT_PAD];
for (let c = 1; c < colWidths.length; c++) {
    colX[c] = colX[c - 1] + colWidths[c - 1] + CAT_PAD * 2;
}
const rowY = [CAT_PAD + 40]; // extra top padding for category labels
for (let r = 1; r < rowHeights.length; r++) {
    rowY[r] = rowY[r - 1] + rowHeights[r - 1] + CAT_PAD * 2;
}

// Step 3: assign final positions to all tables
const catLayout = [];
for (let i = 0; i < activeCats.length; i++) {
    const cat = activeCats[i];
    const gc = i % gridCols;
    const gr = Math.floor(i / gridCols);
    const originX = colX[gc];
    const originY = rowY[gr];
    const b = catBounds[cat];

    catLayout.push({ cat, cx: originX + b.w / 2, cy: originY });

    for (const pos of b.tables) {
        const box = tableBoxes[pos.name];
        box.x = originX + pos.rx;
        box.y = originY + pos.ry;
    }
}

// --- Compute canvas size ---
let maxX = 0, maxY = 0;
for (const box of Object.values(tableBoxes)) {
    maxX = Math.max(maxX, box.x + box.w + 100);
    maxY = Math.max(maxY, box.y + box.h + 100);
}
const canvasW = Math.max(maxX, 3200);
const canvasH = Math.max(maxY, 2800);

// --- Generate HTML ---
let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALDCIS Visual Database Diagram</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
}

/* Toolbar */
.toolbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 1000;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #334155;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.toolbar h1 {
    font-size: 16px;
    font-weight: 700;
    color: #f8fafc;
    margin-right: 8px;
    white-space: nowrap;
}
.toolbar .sep {
    width: 1px;
    height: 24px;
    background: #334155;
}
.btn {
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 8px;
    padding: 6px 14px;
    color: #cbd5e1;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 5px;
}
.btn:hover { border-color: #38bdf8; color: #38bdf8; }
.btn.primary { background: #2563eb; border-color: #3b82f6; color: #fff; }
.btn.primary:hover { background: #1d4ed8; }
.btn svg { width: 14px; height: 14px; fill: currentColor; }

.zoom-info {
    font-size: 12px;
    color: #64748b;
    min-width: 45px;
    text-align: center;
}
.nav-link {
    color: #38bdf8;
    text-decoration: none;
    font-size: 12px;
}
.nav-link:hover { text-decoration: underline; }

/* Canvas area */
.canvas-wrapper {
    position: fixed;
    top: 50px;
    left: 0; right: 0; bottom: 0;
    overflow: hidden;
    cursor: grab;
    background:
        radial-gradient(circle at 50% 50%, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%);
}
.canvas-wrapper:active { cursor: grabbing; }
.canvas-wrapper.dragging-table { cursor: default; }

.canvas {
    position: absolute;
    transform-origin: 0 0;
    width: ${canvasW}px;
    height: ${canvasH}px;
}

/* Grid background */
.grid-bg {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background-image:
        linear-gradient(rgba(51,65,85,0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(51,65,85,0.3) 1px, transparent 1px);
    background-size: 40px 40px;
}

/* SVG arrows */
.arrows-svg {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
}
.arrows-svg path {
    fill: none;
    stroke-width: 1.5;
    opacity: 0.5;
    transition: opacity 0.2s, stroke-width 0.2s;
}
.arrows-svg path.highlighted {
    opacity: 1;
    stroke-width: 2.5;
}
.arrows-svg marker path {
    fill: inherit;
    stroke: none;
}

/* Category labels */
.cat-label {
    position: absolute;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.4;
    pointer-events: none;
    white-space: nowrap;
}

/* Table boxes */
.tbl {
    position: absolute;
    border-radius: 8px;
    border: 2px solid;
    overflow: hidden;
    cursor: move;
    user-select: none;
    transition: box-shadow 0.15s;
    font-size: 11px;
    min-width: ${BOX_W}px;
}
.tbl:hover {
    z-index: 50 !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.tbl.selected {
    z-index: 100 !important;
    box-shadow: 0 0 0 3px rgba(56,189,248,0.5), 0 8px 32px rgba(0,0,0,0.5);
}
.tbl-header {
    padding: 6px 10px;
    font-weight: 700;
    font-size: 12px;
    color: #fff;
    letter-spacing: 0.3px;
    display: flex;
    align-items: center;
    gap: 6px;
}
.tbl-header .tbl-icon { font-size: 10px; opacity: 0.7; }
.tbl-cols {
    padding: 2px 0;
}
.tbl-col {
    display: flex;
    align-items: center;
    padding: 1px 10px;
    gap: 5px;
    line-height: ${COL_H}px;
    height: ${COL_H}px;
}
.tbl-col:hover { filter: brightness(0.95); }
.col-pk { font-weight: 700; }
.col-pk::before { content: '🔑 '; font-size: 9px; }
.col-fk { font-style: italic; }
.col-fk::before { content: '🔗 '; font-size: 9px; }
.col-type {
    margin-left: auto;
    font-size: 9px;
    opacity: 0.6;
    white-space: nowrap;
}

/* Legend */
.legend {
    position: fixed;
    bottom: 16px;
    left: 16px;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(8px);
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 12px 16px;
    z-index: 999;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    font-size: 11px;
}
.legend h3 {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    cursor: pointer;
}
.legend-item:hover { color: #fff; }
.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
}
.legend-count {
    color: #475569;
    font-size: 10px;
    margin-left: auto;
}

/* Minimap */
.minimap {
    position: fixed;
    bottom: 16px;
    right: 16px;
    width: 220px;
    height: 160px;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(8px);
    border: 1px solid #334155;
    border-radius: 10px;
    z-index: 999;
    overflow: hidden;
    cursor: crosshair;
}
.minimap canvas { width: 100%; height: 100%; }
.minimap-viewport {
    position: absolute;
    border: 1.5px solid #38bdf8;
    background: rgba(56, 189, 248, 0.08);
    pointer-events: none;
}

/* Toast notification */
.toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: #1e293b;
    border: 1px solid #334155;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    color: #e2e8f0;
    z-index: 9999;
    transition: transform 0.3s ease;
    pointer-events: none;
}
.toast.show { transform: translateX(-50%) translateY(0); }
</style>
</head>
<body>

<!-- Toolbar -->
<div class="toolbar">
    <h1>📊 ALDCIS Visual Diagram</h1>
    <div class="sep"></div>
    <a href="database_diagram.html" class="nav-link">← Table List View</a>
    <div class="sep"></div>
    <button class="btn" onclick="zoomIn()">
        <svg viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 1 .5.5v3.5H12a.5.5 0 0 1 0 1H8.5V12a.5.5 0 0 1-1 0V8.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5z"/></svg>
        Zoom In
    </button>
    <span class="zoom-info" id="zoomLevel">100%</span>
    <button class="btn" onclick="zoomOut()">
        <svg viewBox="0 0 16 16"><path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/></svg>
        Zoom Out
    </button>
    <button class="btn" onclick="zoomFit()">Fit All</button>
    <button class="btn" onclick="resetLayout()">Reset Layout</button>
    <div class="sep"></div>
    <button class="btn primary" onclick="downloadPNG()">
        <svg viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
        Download PNG
    </button>
    <button class="btn primary" onclick="downloadSVG()">
        <svg viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
        Download SVG
    </button>
</div>

<!-- Canvas -->
<div class="canvas-wrapper" id="canvasWrapper">
    <div class="canvas" id="canvas">
        <div class="grid-bg"></div>
        <svg class="arrows-svg" id="arrowsSvg">
            <defs>
`;

// Generate arrow markers for each category color
const usedColors = new Set();
for (const r of relationships) {
    const col = catColors[tableCat[r.from]]?.border || '#94a3b8';
    usedColors.add(col);
}
for (const col of usedColors) {
    const id = col.replace('#', 'arrow_');
    html += `                <marker id="${id}" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse" fill="${col}">
                    <path d="M 0 0 L 10 3.5 L 0 7 z"/>
                </marker>\n`;
}

html += `            </defs>\n`;

// Generate arrow paths
for (let i = 0; i < relationships.length; i++) {
    const r = relationships[i];
    const col = catColors[tableCat[r.from]]?.border || '#94a3b8';
    const markerId = col.replace('#', 'arrow_');
    html += `            <path id="rel-${i}" data-from="${r.from}" data-to="${r.to}" stroke="${col}" marker-end="url(#${markerId})" />\n`;
}

html += `        </svg>\n\n`;

// Category labels
for (const region of catLayout) {
    const tablesInCat = Object.keys(tableBoxes).filter(n => tableBoxes[n].cat === region.cat);
    if (tablesInCat.length === 0) continue;
    // Place label just above the top-most table
    let minY = Infinity;
    for (const t of tablesInCat) minY = Math.min(minY, tableBoxes[t].y);
    const col = catColors[region.cat];
    html += `        <div class="cat-label" style="left:${region.cx - 100}px; top:${minY - 30}px; color:${col.header}">${region.cat}</div>\n`;
}

// Generate table boxes
for (const [name, box] of Object.entries(tableBoxes)) {
    const def = schema[name];
    const col = catColors[box.cat];

    html += `        <div class="tbl" id="tbl-${name}" data-name="${name}"
             style="left:${box.x}px; top:${box.y}px; width:${box.w}px;
                    background:${col.bg}; border-color:${col.border}"
             onmousedown="startDrag(event, '${name}')"
             onmouseenter="highlightRelated('${name}')"
             onmouseleave="unhighlightAll()">
            <div class="tbl-header" style="background:${col.header}">
                <span class="tbl-icon">⊞</span>
                <span>${name}</span>
            </div>
            <div class="tbl-cols">\n`;

    for (const c of def.columns) {
        const isPk = def.primary_keys.includes(c.name);
        const isFk = def.foreign_keys.some(f => f.columns.includes(c.name));
        let cls = '';
        if (isPk) cls = 'col-pk';
        else if (isFk) cls = 'col-fk';
        const shortT = c.type.replace('longtext', 'text').replace('datetime(6)', 'datetime');
        html += `                <div class="tbl-col ${cls}" style="color:${col.text}">
                    <span>${c.name}</span>
                    <span class="col-type">${shortT}</span>
                </div>\n`;
    }

    html += `            </div>
        </div>\n`;
}

html += `    </div>
</div>

<!-- Legend -->
<div class="legend" id="legend">
    <h3>Categories</h3>
`;

for (const [cat, tables] of Object.entries(categories)) {
    const col = catColors[cat];
    const count = tables.filter(t => schema[t]).length;
    if (count === 0) continue;
    html += `    <div class="legend-item" onclick="focusCategory('${cat}')">
        <div class="legend-dot" style="background:${col.header}"></div>
        <span>${cat}</span>
        <span class="legend-count">${count}</span>
    </div>\n`;
}

html += `    <hr style="border-color:#334155; margin:8px 0">
    <div style="color:#64748b; font-size:10px;">
        🔑 Primary Key &nbsp; 🔗 Foreign Key<br>
        Drag tables to rearrange<br>
        Scroll to zoom · Drag canvas to pan
    </div>
</div>

<!-- Minimap -->
<div class="minimap" id="minimap" onmousedown="minimapNav(event)">
    <canvas id="minimapCanvas" width="220" height="160"></canvas>
    <div class="minimap-viewport" id="minimapViewport"></div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
// --- State ---
const CANVAS_W = ${canvasW};
const CANVAS_H = ${canvasH};
let zoom = 0.45;
let panX = -200;
let panY = -100;
let isPanning = false;
let panStartX, panStartY;
let isDraggingTable = false;
let dragTarget = null;
let dragOffX = 0, dragOffY = 0;

// Table positions (mutable)
const tablePos = ${JSON.stringify(
    Object.fromEntries(Object.entries(tableBoxes).map(([n, b]) => [n, { x: b.x, y: b.y, w: b.w, h: b.h }]))
)};
const origPos = JSON.parse(JSON.stringify(tablePos));

const relationships = ${JSON.stringify(relationships)};
const catColors = ${JSON.stringify(catColors)};
const tableCat = ${JSON.stringify(tableCat)};

const wrapper = document.getElementById('canvasWrapper');
const canvas = document.getElementById('canvas');

// --- Transform ---
function applyTransform() {
    canvas.style.transform = \`scale(\${zoom}) translate(\${panX}px, \${panY}px)\`;
    document.getElementById('zoomLevel').textContent = Math.round(zoom * 100) + '%';
    updateMinimap();
}

// --- Pan ---
wrapper.addEventListener('mousedown', e => {
    if (isDraggingTable) return;
    if (e.target.closest('.tbl')) return;
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
});
window.addEventListener('mousemove', e => {
    if (isPanning) {
        panX += (e.clientX - panStartX) / zoom;
        panY += (e.clientY - panStartY) / zoom;
        panStartX = e.clientX;
        panStartY = e.clientY;
        applyTransform();
    }
    if (isDraggingTable && dragTarget) {
        const nx = (e.clientX - dragOffX) / zoom - panX;
        const ny = (e.clientY - dragOffY - 50) / zoom - panY;
        tablePos[dragTarget].x = Math.round(nx);
        tablePos[dragTarget].y = Math.round(ny);
        const el = document.getElementById('tbl-' + dragTarget);
        el.style.left = tablePos[dragTarget].x + 'px';
        el.style.top = tablePos[dragTarget].y + 'px';
        updateArrows();
        updateMinimap();
    }
});
window.addEventListener('mouseup', () => {
    isPanning = false;
    if (isDraggingTable) {
        isDraggingTable = false;
        wrapper.classList.remove('dragging-table');
        if (dragTarget) {
            const el = document.getElementById('tbl-' + dragTarget);
            if (el) el.classList.remove('selected');
        }
        dragTarget = null;
    }
});

// --- Zoom ---
wrapper.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(2, zoom * delta));

    // Zoom toward cursor
    const rect = wrapper.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    panX -= mx / newZoom - mx / zoom;
    panY -= (my - 50) / newZoom - (my - 50) / zoom;

    zoom = newZoom;
    applyTransform();
}, { passive: false });

function zoomIn() { zoom = Math.min(2, zoom * 1.2); applyTransform(); }
function zoomOut() { zoom = Math.max(0.1, zoom * 0.8); applyTransform(); }
function zoomFit() {
    const wW = wrapper.clientWidth;
    const wH = wrapper.clientHeight;
    zoom = Math.min(wW / CANVAS_W, wH / CANVAS_H) * 0.9;
    panX = (wW / zoom - CANVAS_W) / 2;
    panY = (wH / zoom - CANVAS_H) / 2;
    applyTransform();
}

// --- Drag tables ---
function startDrag(e, name) {
    e.stopPropagation();
    isDraggingTable = true;
    dragTarget = name;
    wrapper.classList.add('dragging-table');
    const el = document.getElementById('tbl-' + name);
    el.classList.add('selected');
    const rect = el.getBoundingClientRect();
    dragOffX = e.clientX - rect.left;
    dragOffY = e.clientY - rect.top;
}

function resetLayout() {
    for (const [n, p] of Object.entries(origPos)) {
        tablePos[n].x = p.x;
        tablePos[n].y = p.y;
        const el = document.getElementById('tbl-' + n);
        el.style.left = p.x + 'px';
        el.style.top = p.y + 'px';
    }
    updateArrows();
    zoomFit();
    showToast('Layout reset');
}

// --- Arrows ---
function updateArrows() {
    for (let i = 0; i < relationships.length; i++) {
        const r = relationships[i];
        const fromBox = tablePos[r.from];
        const toBox = tablePos[r.to];
        if (!fromBox || !toBox) continue;

        const path = document.getElementById('rel-' + i);
        if (!path) continue;

        // Find best connection points
        const fc = { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 };
        const tc = { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 };

        let x1, y1, x2, y2;

        // Determine sides
        const dx = tc.x - fc.x;
        const dy = tc.y - fc.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal connection
            if (dx > 0) {
                x1 = fromBox.x + fromBox.w;
                x2 = toBox.x;
            } else {
                x1 = fromBox.x;
                x2 = toBox.x + toBox.w;
            }
            y1 = fc.y;
            y2 = tc.y;
        } else {
            // Vertical connection
            if (dy > 0) {
                y1 = fromBox.y + fromBox.h;
                y2 = toBox.y;
            } else {
                y1 = fromBox.y;
                y2 = toBox.y + toBox.h;
            }
            x1 = fc.x;
            x2 = tc.x;
        }

        // Bezier curve
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        let cpx1, cpy1, cpx2, cpy2;

        if (Math.abs(dx) > Math.abs(dy)) {
            cpx1 = mx; cpy1 = y1;
            cpx2 = mx; cpy2 = y2;
        } else {
            cpx1 = x1; cpy1 = my;
            cpx2 = x2; cpy2 = my;
        }

        path.setAttribute('d', \`M \${x1} \${y1} C \${cpx1} \${cpy1}, \${cpx2} \${cpy2}, \${x2} \${y2}\`);
    }
}

// --- Highlight ---
function highlightRelated(name) {
    document.querySelectorAll('.arrows-svg path').forEach(p => {
        if (p.dataset.from === name || p.dataset.to === name) {
            p.classList.add('highlighted');
        }
    });
    // Highlight connected tables
    relationships.forEach(r => {
        if (r.from === name) document.getElementById('tbl-' + r.to)?.classList.add('selected');
        if (r.to === name) document.getElementById('tbl-' + r.from)?.classList.add('selected');
    });
}
function unhighlightAll() {
    document.querySelectorAll('.arrows-svg path.highlighted').forEach(p => p.classList.remove('highlighted'));
    document.querySelectorAll('.tbl.selected').forEach(t => {
        if (t.dataset.name !== dragTarget) t.classList.remove('selected');
    });
}

// --- Focus category ---
function focusCategory(cat) {
    const tables = Object.entries(tablePos).filter(([n]) => tableCat[n] === cat);
    if (tables.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const [n, p] of tables) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + p.w);
        maxY = Math.max(maxY, p.y + p.h);
    }

    const regionW = maxX - minX + 100;
    const regionH = maxY - minY + 100;
    const wW = wrapper.clientWidth;
    const wH = wrapper.clientHeight - 50;

    zoom = Math.min(wW / regionW, wH / regionH) * 0.85;
    zoom = Math.max(0.15, Math.min(1.5, zoom));
    panX = (wW / zoom - regionW) / 2 - minX + 50;
    panY = (wH / zoom - regionH) / 2 - minY + 50;
    applyTransform();
}

// --- Minimap ---
function updateMinimap() {
    const mc = document.getElementById('minimapCanvas');
    const ctx = mc.getContext('2d');
    const mw = mc.width;
    const mh = mc.height;
    const scaleX = mw / CANVAS_W;
    const scaleY = mh / CANVAS_H;
    const scale = Math.min(scaleX, scaleY);

    ctx.clearRect(0, 0, mw, mh);

    // Draw tables
    for (const [name, p] of Object.entries(tablePos)) {
        const col = catColors[tableCat[name]]?.header || '#666';
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(p.x * scale, p.y * scale, p.w * scale, Math.max(p.h * scale, 2));
    }
    ctx.globalAlpha = 1;

    // Draw arrows
    ctx.strokeStyle = 'rgba(56,189,248,0.3)';
    ctx.lineWidth = 0.5;
    for (const r of relationships) {
        const f = tablePos[r.from], t = tablePos[r.to];
        if (!f || !t) continue;
        ctx.beginPath();
        ctx.moveTo((f.x + f.w / 2) * scale, (f.y + f.h / 2) * scale);
        ctx.lineTo((t.x + t.w / 2) * scale, (t.y + t.h / 2) * scale);
        ctx.stroke();
    }

    // Viewport rectangle
    const vp = document.getElementById('minimapViewport');
    const wW = wrapper.clientWidth;
    const wH = wrapper.clientHeight - 50;
    const vpX = -panX * scale;
    const vpY = -panY * scale;
    const vpW = (wW / zoom) * scale;
    const vpH = (wH / zoom) * scale;
    vp.style.left = vpX + 'px';
    vp.style.top = vpY + 'px';
    vp.style.width = vpW + 'px';
    vp.style.height = vpH + 'px';
}

function minimapNav(e) {
    const mm = document.getElementById('minimap');
    const rect = mm.getBoundingClientRect();
    const mc = document.getElementById('minimapCanvas');
    const scaleX = mc.width / CANVAS_W;
    const scaleY = mc.height / CANVAS_H;
    const scale = Math.min(scaleX, scaleY);

    const wW = wrapper.clientWidth;
    const wH = wrapper.clientHeight - 50;

    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;

    panX = -(mx - wW / zoom / 2);
    panY = -(my - wH / zoom / 2);
    applyTransform();
}

// --- Download PNG ---
function downloadPNG() {
    showToast('Rendering PNG... please wait');

    // Compute bounds
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const p of Object.values(tablePos)) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + p.w);
        maxY = Math.max(maxY, p.y + p.h);
    }
    const pad = 60;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const cw = maxX - minX;
    const ch = maxY - minY;

    const c = document.createElement('canvas');
    c.width = cw * 2; // 2x resolution
    c.height = ch * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    ctx.translate(-minX, -minY);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(minX, minY, cw, ch);

    // Grid
    ctx.strokeStyle = 'rgba(51,65,85,0.3)';
    ctx.lineWidth = 0.5;
    for (let x = Math.floor(minX/40)*40; x <= maxX; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, minY); ctx.lineTo(x, maxY); ctx.stroke();
    }
    for (let y = Math.floor(minY/40)*40; y <= maxY; y += 40) {
        ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke();
    }

    // Draw arrows
    for (const r of relationships) {
        const fromBox = tablePos[r.from];
        const toBox = tablePos[r.to];
        if (!fromBox || !toBox) continue;

        const col = catColors[tableCat[r.from]]?.border || '#94a3b8';
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;

        const fc = { x: fromBox.x + fromBox.w/2, y: fromBox.y + fromBox.h/2 };
        const tc = { x: toBox.x + toBox.w/2, y: toBox.y + toBox.h/2 };
        const dx = tc.x - fc.x;
        const dy = tc.y - fc.y;

        let x1, y1, x2, y2;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) { x1 = fromBox.x + fromBox.w; x2 = toBox.x; }
            else { x1 = fromBox.x; x2 = toBox.x + toBox.w; }
            y1 = fc.y; y2 = tc.y;
        } else {
            if (dy > 0) { y1 = fromBox.y + fromBox.h; y2 = toBox.y; }
            else { y1 = fromBox.y; y2 = toBox.y + toBox.h; }
            x1 = fc.x; x2 = tc.x;
        }

        const mx = (x1+x2)/2, my2 = (y1+y2)/2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        if (Math.abs(dx) > Math.abs(dy)) {
            ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
        } else {
            ctx.bezierCurveTo(x1, my2, x2, my2, x2, y2);
        }
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(y2 - (Math.abs(dx) > Math.abs(dy) ? y2 : my2),
                                 x2 - (Math.abs(dx) > Math.abs(dy) ? mx : x2));
        const headLen = 8;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6), y2 - headLen * Math.sin(angle - Math.PI/6));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6), y2 - headLen * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    // Draw table boxes
    for (const [name, p] of Object.entries(tablePos)) {
        const def = window._schema[name];
        const col = catColors[tableCat[name]];
        if (!def || !col) continue;

        // Box shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(p.x + 3, p.y + 3, p.w, p.h);

        // Background
        ctx.fillStyle = col.bg;
        ctx.strokeStyle = col.border;
        ctx.lineWidth = 2;
        roundRect(ctx, p.x, p.y, p.w, p.h, 6);
        ctx.fill();
        ctx.stroke();

        // Header
        ctx.fillStyle = col.header;
        roundRectTop(ctx, p.x, p.y, p.w, 26, 6);
        ctx.fill();

        // Table name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Segoe UI, sans-serif';
        ctx.fillText(name, p.x + 10, p.y + 17);

        // Columns
        ctx.font = '10px Segoe UI, sans-serif';
        const colStartY = p.y + 30;
        for (let ci = 0; ci < def.columns.length; ci++) {
            const c = def.columns[ci];
            const cy = colStartY + ci * ${COL_H};
            const isPk = def.primary_keys.includes(c.name);
            const isFk = def.foreign_keys.some(f => f.columns.includes(c.name));

            if (isPk) {
                ctx.fillStyle = '#b45309';
                ctx.font = 'bold 10px Segoe UI, sans-serif';
            } else if (isFk) {
                ctx.fillStyle = '#0369a1';
                ctx.font = 'italic 10px Segoe UI, sans-serif';
            } else {
                ctx.fillStyle = col.text;
                ctx.font = '10px Segoe UI, sans-serif';
            }

            let prefix = isPk ? '🔑 ' : (isFk ? '🔗 ' : '   ');
            ctx.fillText(prefix + c.name, p.x + 8, cy + 13);

            // Type
            ctx.fillStyle = col.text;
            ctx.globalAlpha = 0.5;
            ctx.font = '8px Segoe UI, sans-serif';
            const shortType = c.type.replace('longtext','text').replace('datetime(6)','datetime');
            const tw = ctx.measureText(shortType).width;
            ctx.fillText(shortType, p.x + p.w - tw - 8, cy + 13);
            ctx.globalAlpha = 1;
        }
    }

    // Watermark
    ctx.fillStyle = '#334155';
    ctx.font = '14px Segoe UI, sans-serif';
    ctx.fillText('ALDCIS Database Diagram — Generated ' + new Date().toLocaleDateString(), minX + 20, maxY - 20);

    c.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ALDCIS_Database_Diagram.png';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('PNG downloaded!');
    }, 'image/png');
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
function roundRectTop(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// --- Download SVG ---
function downloadSVG() {
    showToast('Generating SVG...');

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const p of Object.values(tablePos)) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + p.w);
        maxY = Math.max(maxY, p.y + p.h);
    }
    const pad = 60;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const w = maxX - minX;
    const h = maxY - minY;

    let svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="\${w}" height="\${h}" viewBox="\${minX} \${minY} \${w} \${h}" font-family="Segoe UI, sans-serif">\\n\`;
    svg += \`<rect x="\${minX}" y="\${minY}" width="\${w}" height="\${h}" fill="#0f172a"/>\\n\`;

    // Arrows
    for (const r of relationships) {
        const fromBox = tablePos[r.from];
        const toBox = tablePos[r.to];
        if (!fromBox || !toBox) continue;
        const col = catColors[tableCat[r.from]]?.border || '#94a3b8';
        const fc = { x: fromBox.x + fromBox.w/2, y: fromBox.y + fromBox.h/2 };
        const tc = { x: toBox.x + toBox.w/2, y: toBox.y + toBox.h/2 };
        const dx = tc.x - fc.x, dy = tc.y - fc.y;
        let x1,y1,x2,y2;
        if (Math.abs(dx) > Math.abs(dy)) {
            x1 = dx>0 ? fromBox.x+fromBox.w : fromBox.x;
            x2 = dx>0 ? toBox.x : toBox.x+toBox.w;
            y1=fc.y; y2=tc.y;
        } else {
            y1 = dy>0 ? fromBox.y+fromBox.h : fromBox.y;
            y2 = dy>0 ? toBox.y : toBox.y+toBox.h;
            x1=fc.x; x2=tc.x;
        }
        const mx=(x1+x2)/2, my=(y1+y2)/2;
        let d;
        if (Math.abs(dx)>Math.abs(dy)) {
            d=\`M \${x1} \${y1} C \${mx} \${y1}, \${mx} \${y2}, \${x2} \${y2}\`;
        } else {
            d=\`M \${x1} \${y1} C \${x1} \${my}, \${x2} \${my}, \${x2} \${y2}\`;
        }
        svg += \`<path d="\${d}" fill="none" stroke="\${col}" stroke-width="1.5" opacity="0.5"/>\\n\`;
    }

    // Tables
    for (const [name, p] of Object.entries(tablePos)) {
        const def = window._schema[name];
        const col = catColors[tableCat[name]];
        if (!def || !col) continue;

        svg += \`<rect x="\${p.x}" y="\${p.y}" width="\${p.w}" height="\${p.h}" rx="6" fill="\${col.bg}" stroke="\${col.border}" stroke-width="2"/>\\n\`;
        svg += \`<rect x="\${p.x}" y="\${p.y}" width="\${p.w}" height="26" rx="6" fill="\${col.header}"/>\\n\`;
        svg += \`<rect x="\${p.x}" y="\${p.y+20}" width="\${p.w}" height="6" fill="\${col.header}"/>\\n\`;
        svg += \`<text x="\${p.x+10}" y="\${p.y+17}" fill="#fff" font-size="11" font-weight="bold">\${name}</text>\\n\`;

        for (let ci = 0; ci < def.columns.length; ci++) {
            const c = def.columns[ci];
            const cy = p.y + 30 + ci * ${COL_H};
            const isPk = def.primary_keys.includes(c.name);
            const isFk = def.foreign_keys.some(f => f.columns.includes(c.name));
            const fill = isPk ? '#b45309' : (isFk ? '#0369a1' : col.text);
            const fw = isPk ? 'bold' : 'normal';
            const prefix = isPk ? '🔑 ' : (isFk ? '🔗 ' : '');
            svg += \`<text x="\${p.x+8}" y="\${cy+13}" fill="\${fill}" font-size="10" font-weight="\${fw}">\${prefix}\${escXml(c.name)}</text>\\n\`;
        }
    }

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ALDCIS_Database_Diagram.svg';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('SVG downloaded!');
}

function escXml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- Toast ---
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// --- Schema data for canvas rendering ---
window._schema = ${JSON.stringify(Object.fromEntries(
    Object.entries(schema).map(([name, def]) => [name, {
        columns: def.columns.map(c => ({ name: c.name, type: c.type })),
        primary_keys: def.primary_keys,
        foreign_keys: def.foreign_keys.map(f => ({ columns: f.columns }))
    }])
))};

// --- Init ---
updateArrows();
zoomFit();

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') zoomIn();
    if (e.key === '-') zoomOut();
    if (e.key === '0') zoomFit();
});
</script>

</body>
</html>`;

fs.writeFileSync('visual_diagram.html', html, 'utf-8');
console.log('Generated visual_diagram.html (' + Math.round(html.length / 1024) + ' KB)');
