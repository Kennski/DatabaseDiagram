const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('schema.json', 'utf-8'));

// Collect all FK relationships
const relationships = [];
for (const [tbl, def] of Object.entries(schema)) {
    for (const fk of def.foreign_keys) {
        relationships.push({
            from_table: tbl,
            from_columns: fk.columns,
            to_table: fk.ref_table,
            to_columns: fk.ref_columns,
            actions: fk.actions
        });
    }
}

// Group tables into categories
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

// Assign category colors
const categoryColors = {
    'Core Business': { bg: '#dbeafe', border: '#3b82f6', header: '#2563eb', headerText: '#fff' },
    'Clinic Services': { bg: '#dcfce7', border: '#22c55e', header: '#16a34a', headerText: '#fff' },
    'Software & Versions': { bg: '#fef3c7', border: '#f59e0b', header: '#d97706', headerText: '#fff' },
    'Backup & Monitoring': { bg: '#fee2e2', border: '#ef4444', header: '#dc2626', headerText: '#fff' },
    'Computers': { bg: '#e0e7ff', border: '#6366f1', header: '#4f46e5', headerText: '#fff' },
    'Identity & Auth': { bg: '#fce7f3', border: '#ec4899', header: '#db2777', headerText: '#fff' },
    'External Integrations': { bg: '#ccfbf1', border: '#14b8a6', header: '#0d9488', headerText: '#fff' },
    'Audit & Logs': { bg: '#f3e8ff', border: '#a855f7', header: '#9333ea', headerText: '#fff' },
    'Hangfire (Job Queue)': { bg: '#fff7ed', border: '#f97316', header: '#ea580c', headerText: '#fff' },
    'Legacy Job Queue': { bg: '#f1f5f9', border: '#94a3b8', header: '#64748b', headerText: '#fff' },
    'System': { bg: '#f5f5f5', border: '#a3a3a3', header: '#737373', headerText: '#fff' }
};

// Build table-to-category map
const tableCategory = {};
for (const [cat, tables] of Object.entries(categories)) {
    for (const t of tables) tableCategory[t] = cat;
}
// Any uncategorized tables
for (const t of Object.keys(schema)) {
    if (!tableCategory[t]) tableCategory[t] = 'System';
}

// Type badge color
function typeColor(type) {
    const t = type.toLowerCase();
    if (t.includes('int')) return '#3b82f6';
    if (t.includes('varchar') || t.includes('char') || t.includes('text') || t.includes('longtext')) return '#22c55e';
    if (t.includes('datetime') || t.includes('date') || t.includes('time')) return '#f59e0b';
    if (t.includes('tinyint') || t.includes('bit') || t.includes('bool')) return '#ec4899';
    if (t.includes('decimal') || t.includes('float') || t.includes('double')) return '#8b5cf6';
    return '#64748b';
}

function shortType(type) {
    return type.replace(/\(\d+(?:,\d+)?\)/, m => m);
}

// Build HTML
let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALDCIS Database Diagram</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        min-height: 100vh;
    }
    .header {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border-bottom: 1px solid #334155;
        padding: 24px 32px;
        position: sticky;
        top: 0;
        z-index: 100;
    }
    .header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #f8fafc;
        margin-bottom: 4px;
    }
    .header .subtitle {
        font-size: 14px;
        color: #94a3b8;
    }
    .stats {
        display: flex;
        gap: 24px;
        margin-top: 12px;
        flex-wrap: wrap;
    }
    .stat {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 13px;
    }
    .stat strong { color: #38bdf8; font-size: 18px; margin-right: 6px; }
    
    .controls {
        display: flex;
        gap: 12px;
        margin-top: 12px;
        align-items: center;
        flex-wrap: wrap;
    }
    .search-box {
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 8px;
        padding: 8px 14px;
        color: #e2e8f0;
        font-size: 14px;
        width: 280px;
        outline: none;
    }
    .search-box:focus { border-color: #38bdf8; }
    .search-box::placeholder { color: #64748b; }
    
    .filter-btn {
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 8px;
        padding: 6px 14px;
        color: #cbd5e1;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
    }
    .filter-btn:hover { border-color: #38bdf8; color: #38bdf8; }
    .filter-btn.active { background: #38bdf8; color: #0f172a; border-color: #38bdf8; font-weight: 600; }

    .content {
        padding: 24px 32px;
    }
    
    .category-section {
        margin-bottom: 32px;
    }
    .category-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        cursor: pointer;
        user-select: none;
    }
    .category-header h2 {
        font-size: 18px;
        font-weight: 600;
    }
    .category-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .category-count {
        font-size: 12px;
        background: #334155;
        padding: 2px 10px;
        border-radius: 12px;
        color: #94a3b8;
    }
    .toggle-icon {
        font-size: 12px;
        color: #64748b;
        margin-left: auto;
        transition: transform 0.2s;
    }
    .category-header.collapsed .toggle-icon { transform: rotate(-90deg); }
    
    .tables-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
        gap: 16px;
    }
    
    .table-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.2s;
    }
    .table-card:hover {
        border-color: #475569;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transform: translateY(-1px);
    }
    .table-card.highlight {
        border-color: #38bdf8 !important;
        box-shadow: 0 0 0 2px rgba(56,189,248,0.2);
    }
    
    .table-header {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
    }
    .table-name {
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.3px;
    }
    .table-col-count {
        font-size: 11px;
        background: rgba(255,255,255,0.15);
        padding: 1px 8px;
        border-radius: 10px;
        margin-left: auto;
        white-space: nowrap;
    }
    .table-fk-badge {
        font-size: 10px;
        background: rgba(255,255,255,0.1);
        padding: 1px 6px;
        border-radius: 8px;
        white-space: nowrap;
    }
    
    .table-body {
        display: none;
    }
    .table-card.expanded .table-body {
        display: block;
    }
    
    .column-row {
        display: flex;
        align-items: center;
        padding: 4px 16px;
        font-size: 12px;
        border-top: 1px solid rgba(255,255,255,0.04);
        gap: 6px;
    }
    .column-row:hover { background: rgba(255,255,255,0.03); }
    
    .col-icon {
        width: 16px;
        text-align: center;
        flex-shrink: 0;
        font-size: 10px;
    }
    .col-icon.pk { color: #f59e0b; }
    .col-icon.fk { color: #38bdf8; }
    .col-icon.normal { color: #475569; }
    
    .col-name {
        font-weight: 500;
        color: #f1f5f9;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .col-name.pk-col { color: #fbbf24; }
    .col-name.fk-col { color: #7dd3fc; }
    
    .col-type {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        color: #fff;
        opacity: 0.8;
        white-space: nowrap;
        flex-shrink: 0;
    }
    
    .col-nullable {
        font-size: 9px;
        color: #64748b;
        flex-shrink: 0;
        width: 14px;
        text-align: center;
    }
    
    .fk-ref {
        font-size: 10px;
        color: #38bdf8;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
    }
    .fk-ref:hover { text-decoration: underline; }
    
    .table-footer {
        padding: 6px 16px 10px;
        border-top: 1px solid rgba(255,255,255,0.06);
    }
    .fk-list {
        font-size: 11px;
        color: #94a3b8;
    }
    .fk-item {
        padding: 3px 0;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .fk-arrow { color: #38bdf8; }
    .fk-target {
        color: #7dd3fc;
        cursor: pointer;
    }
    .fk-target:hover { text-decoration: underline; }
    
    /* Relationship view */
    .rel-section {
        margin-top: 40px;
        border-top: 1px solid #334155;
        padding-top: 24px;
    }
    .rel-section h2 {
        font-size: 18px;
        margin-bottom: 16px;
    }
    .rel-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }
    .rel-table th {
        text-align: left;
        padding: 8px 12px;
        background: #1e293b;
        border-bottom: 2px solid #334155;
        font-weight: 600;
        color: #94a3b8;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .rel-table td {
        padding: 6px 12px;
        border-bottom: 1px solid #1e293b;
    }
    .rel-table tr:hover td { background: rgba(56,189,248,0.05); }
    .rel-from { color: #fbbf24; cursor: pointer; }
    .rel-to { color: #7dd3fc; cursor: pointer; }
    .rel-from:hover, .rel-to:hover { text-decoration: underline; }
    .rel-col { color: #94a3b8; }
    .rel-action { color: #64748b; font-size: 11px; }

    .hidden { display: none !important; }
    
    @media (max-width: 768px) {
        .tables-grid { grid-template-columns: 1fr; }
        .header, .content { padding: 16px; }
        .search-box { width: 100%; }
    }
</style>
</head>
<body>

<div class="header">
    <h1>ALDCIS Database Schema Diagram</h1>
    <div class="subtitle">aldcis2 &mdash; MariaDB 12.1.2 &mdash; Generated from SQL dump</div>
    <div class="stats">
        <div class="stat"><strong>${Object.keys(schema).length}</strong> Tables</div>
        <div class="stat"><strong>${relationships.length}</strong> Foreign Keys</div>
        <div class="stat"><strong>${Object.values(schema).reduce((sum, t) => sum + t.columns.length, 0)}</strong> Columns</div>
        <div class="stat"><strong>${Object.keys(categories).length}</strong> Categories</div>
    </div>
    <div class="controls">
        <input type="text" class="search-box" id="searchBox" placeholder="Search tables or columns..." />
        <button class="filter-btn active" data-filter="all" onclick="filterCategory('all', this)">All</button>
${Object.keys(categories).map(cat => 
    `        <button class="filter-btn" data-filter="${cat}" onclick="filterCategory('${cat}', this)">${cat}</button>`
).join('\n')}
        <button class="filter-btn" onclick="expandAll()" title="Expand all tables">Expand All</button>
        <button class="filter-btn" onclick="collapseAll()" title="Collapse all tables">Collapse All</button>
    </div>
</div>

<div class="content">
`;

// Render each category
for (const [cat, tableNames] of Object.entries(categories)) {
    const colors = categoryColors[cat];
    const validTables = tableNames.filter(t => schema[t]);
    if (validTables.length === 0) continue;
    
    html += `
    <div class="category-section" data-category="${cat}">
        <div class="category-header" onclick="toggleCategory(this)">
            <div class="category-dot" style="background: ${colors.header}"></div>
            <h2 style="color: ${colors.header}">${cat}</h2>
            <span class="category-count">${validTables.length} table${validTables.length > 1 ? 's' : ''}</span>
            <span class="toggle-icon">▼</span>
        </div>
        <div class="tables-grid">
`;
    
    for (const tableName of validTables) {
        const table = schema[tableName];
        const fkCount = table.foreign_keys.length;
        // Count incoming FKs
        const incomingFks = relationships.filter(r => r.to_table === tableName);
        
        html += `
            <div class="table-card" id="table-${tableName}" data-table="${tableName}" data-category="${cat}">
                <div class="table-header" style="background: ${colors.header}; color: ${colors.headerText}" onclick="toggleTable(this.parentElement)">
                    <span class="table-name">${tableName}</span>
                    <span class="table-col-count">${table.columns.length} cols</span>`;
        if (fkCount > 0) html += `\n                    <span class="table-fk-badge">${fkCount} FK↗</span>`;
        if (incomingFks.length > 0) html += `\n                    <span class="table-fk-badge">${incomingFks.length} FK↙</span>`;
        html += `
                </div>
                <div class="table-body">`;
        
        // Columns
        for (const col of table.columns) {
            const isPk = table.primary_keys.includes(col.name);
            const fk = table.foreign_keys.find(f => f.columns.includes(col.name));
            const iconClass = isPk ? 'pk' : (fk ? 'fk' : 'normal');
            const icon = isPk ? '🔑' : (fk ? '🔗' : '·');
            const nameClass = isPk ? 'pk-col' : (fk ? 'fk-col' : '');
            
            html += `
                    <div class="column-row">
                        <span class="col-icon ${iconClass}">${icon}</span>
                        <span class="col-name ${nameClass}">${col.name}</span>
                        <span class="col-type" style="background: ${typeColor(col.type)}">${shortType(col.type)}</span>
                        <span class="col-nullable">${col.nullable ? '○' : '●'}</span>`;
            if (fk) {
                html += `<span class="fk-ref" onclick="scrollToTable('${fk.ref_table}')" title="${fk.ref_table}.${fk.ref_columns.join(',')}">${fk.ref_table}</span>`;
            }
            html += `
                    </div>`;
        }
        
        // FK summary footer
        if (fkCount > 0 || incomingFks.length > 0) {
            html += `
                    <div class="table-footer">
                        <div class="fk-list">`;
            for (const fk of table.foreign_keys) {
                html += `
                            <div class="fk-item">
                                <span class="fk-arrow">→</span>
                                <span>${fk.columns.join(', ')}</span>
                                <span class="fk-arrow">→</span>
                                <span class="fk-target" onclick="scrollToTable('${fk.ref_table}')">${fk.ref_table}.${fk.ref_columns.join(',')}</span>
                                ${fk.actions ? `<span class="rel-action">${fk.actions}</span>` : ''}
                            </div>`;
            }
            for (const inc of incomingFks) {
                html += `
                            <div class="fk-item">
                                <span class="fk-arrow">←</span>
                                <span class="fk-target" onclick="scrollToTable('${inc.from_table}')">${inc.from_table}.${inc.from_columns.join(',')}</span>
                                <span class="fk-arrow">→</span>
                                <span>${inc.to_columns.join(', ')}</span>
                            </div>`;
            }
            html += `
                        </div>
                    </div>`;
        }
        
        html += `
                </div>
            </div>`;
    }
    
    html += `
        </div>
    </div>`;
}

// Relationship table
html += `
    <div class="rel-section">
        <h2>All Foreign Key Relationships (${relationships.length})</h2>
        <table class="rel-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>From Table</th>
                    <th>Column(s)</th>
                    <th></th>
                    <th>To Table</th>
                    <th>Column(s)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>`;

relationships.forEach((r, i) => {
    html += `
                <tr>
                    <td style="color:#475569">${i + 1}</td>
                    <td><span class="rel-from" onclick="scrollToTable('${r.from_table}')">${r.from_table}</span></td>
                    <td class="rel-col">${r.from_columns.join(', ')}</td>
                    <td style="color:#38bdf8">→</td>
                    <td><span class="rel-to" onclick="scrollToTable('${r.to_table}')">${r.to_table}</span></td>
                    <td class="rel-col">${r.to_columns.join(', ')}</td>
                    <td class="rel-action">${r.actions || '—'}</td>
                </tr>`;
});

html += `
            </tbody>
        </table>
    </div>
</div>

<script>
function toggleTable(card) {
    card.classList.toggle('expanded');
}

function toggleCategory(header) {
    header.classList.toggle('collapsed');
    const grid = header.nextElementSibling;
    grid.classList.toggle('hidden');
}

function expandAll() {
    document.querySelectorAll('.table-card').forEach(c => c.classList.add('expanded'));
}
function collapseAll() {
    document.querySelectorAll('.table-card').forEach(c => c.classList.remove('expanded'));
}

function scrollToTable(name) {
    const el = document.getElementById('table-' + name);
    if (el) {
        el.classList.add('expanded', 'highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove hidden parent
        const section = el.closest('.category-section');
        if (section) {
            const grid = section.querySelector('.tables-grid');
            const header = section.querySelector('.category-header');
            grid.classList.remove('hidden');
            header.classList.remove('collapsed');
        }
        setTimeout(() => el.classList.remove('highlight'), 3000);
    }
}

function filterCategory(cat, btn) {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    document.querySelectorAll('.category-section').forEach(s => {
        if (cat === 'all' || s.dataset.category === cat) {
            s.classList.remove('hidden');
        } else {
            s.classList.add('hidden');
        }
    });
}

// Search
document.getElementById('searchBox').addEventListener('input', function(e) {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.table-card').forEach(card => {
        if (!q) {
            card.classList.remove('hidden');
            card.classList.remove('expanded');
            return;
        }
        const tableName = card.dataset.table;
        const cols = Array.from(card.querySelectorAll('.col-name')).map(c => c.textContent.toLowerCase());
        const match = tableName.includes(q) || cols.some(c => c.includes(q));
        card.classList.toggle('hidden', !match);
        if (match) card.classList.add('expanded');
    });
    // Show all categories when searching
    if (q) {
        document.querySelectorAll('.category-section').forEach(s => {
            const hasVisible = s.querySelector('.table-card:not(.hidden)');
            s.classList.toggle('hidden', !hasVisible);
            if (hasVisible) {
                s.querySelector('.tables-grid').classList.remove('hidden');
                s.querySelector('.category-header').classList.remove('collapsed');
            }
        });
        document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
    } else {
        document.querySelectorAll('.category-section').forEach(s => s.classList.remove('hidden'));
        document.querySelector('.filter-btn[data-filter=\\"all\\"]').classList.add('active');
    }
});
</script>

</body>
</html>`;

fs.writeFileSync('database_diagram.html', html, 'utf-8');
console.log('Generated database_diagram.html (' + Math.round(html.length / 1024) + ' KB)');
