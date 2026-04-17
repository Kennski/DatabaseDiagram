# Live Data Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-step migration wizard that connects to two databases (any engine combo), lets users configure table/column mappings, confirms the plan with mandatory acceptance, and executes the migration with live progress tracking.

**Architecture:** Server-side: connection pool manager with UUID sessions, 5 new API endpoints (`/api/connect`, `/api/disconnect`, `/api/migrate`, `/api/migrate/:id/status`, `/api/migrate/:id/cancel`), cross-engine type conversion map, batch read/write with per-table transactions. Client-side: new `dynamic-migrate.html` with a 4-step wizard (connect → configure → review → execute), progress polling, and Migrate tab in nav bar on all pages.

**Tech Stack:** Express.js, mysql2, pg, mssql (existing deps), vanilla JS frontend, CSS custom properties (theming)

**Spec:** `docs/superpowers/specs/2026-04-17-data-migration-design.md`

---

### Task 1: Add Migrate Tab to Nav Bar on All Pages

**Files:**
- Modify: `public/dynamic-list.html`
- Modify: `public/dynamic-visual.html`
- Modify: `public/dynamic-analysis.html`
- Modify: `public/dynamic-diff.html`
- Modify: `public/dynamic-query.html`
- Modify: `public/index.html`

- [ ] **Step 1: Add CSS to all 6 pages**

Add after the existing `.nav-tab.query-tab.has-query` rule:

```css
.nav-tab.migrate-tab { opacity: 0.4; }
.nav-tab.migrate-tab.has-migrate { opacity: 1; }
```

- [ ] **Step 2: Add Migrate tab HTML to `.nav-center` in all 6 pages**

Add after the Query tab:

```html
<a href="/dynamic-migrate.html" class="nav-tab migrate-tab" id="migrateTab">Migrate</a>
```

For `index.html` (minimal nav), add it next to the theme toggle.

- [ ] **Step 3: Add Migrate tab visibility JS to all 6 pages**

```javascript
(function() {
    var migrateTab = document.getElementById('migrateTab');
    if (migrateTab && sessionStorage.getItem('dbdiagram_migrate_session')) {
        migrateTab.classList.add('has-migrate');
    }
})();
```

- [ ] **Step 4: Commit**

```bash
git add public/dynamic-list.html public/dynamic-visual.html public/dynamic-analysis.html public/dynamic-diff.html public/dynamic-query.html public/index.html
git commit -m "feat: add dimmed Migrate tab to nav bar on all pages"
```

---

### Task 2: Server — Connection Pool Manager

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add connection pool manager at the top of server.js (after the existing requires)**

```javascript
const crypto = require('crypto');

/* ================================================================
   Connection Pool Manager — persistent DB sessions for migration
   ================================================================ */
const connectionPool = new Map(); // sessionId → { connection, dbType, database, version, schema, lastActivity, timeoutHandle }
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SESSIONS = 10;

function resetIdleTimer(sessionId) {
    const session = connectionPool.get(sessionId);
    if (!session) return;
    clearTimeout(session.timeoutHandle);
    session.lastActivity = Date.now();
    session.timeoutHandle = setTimeout(() => closeSession(sessionId), IDLE_TIMEOUT_MS);
}

async function closeSession(sessionId) {
    const session = connectionPool.get(sessionId);
    if (!session) return;
    clearTimeout(session.timeoutHandle);
    try {
        if (session.dbType === 'mysql' || session.dbType === 'mariadb') {
            await session.connection.end();
        } else if (session.dbType === 'postgres' || session.dbType === 'postgresql') {
            await session.connection.end();
        } else if (session.dbType === 'mssql' || session.dbType === 'sqlserver') {
            await session.connection.close();
        }
    } catch (e) { /* ignore close errors */ }
    connectionPool.delete(sessionId);
}

// Cleanup all sessions on server shutdown
process.on('SIGINT', async () => {
    for (const [id] of connectionPool) await closeSession(id);
    process.exit(0);
});
```

- [ ] **Step 2: Add POST /api/connect endpoint**

```javascript
app.post('/api/connect', async (req, res) => {
    if (connectionPool.size >= MAX_SESSIONS) {
        return res.status(503).json({ error: 'Maximum concurrent sessions reached. Disconnect an existing session first.' });
    }

    const { dbType, host, port, user, password, database } = req.body;
    if (!host || !database) {
        return res.status(400).json({ error: 'host and database are required.' });
    }

    try {
        let connection, result;
        const type = (dbType || 'mysql').toLowerCase();

        switch (type) {
            case 'mysql':
            case 'mariadb': {
                connection = await mysql.createConnection({
                    host, port: parseInt(port) || 3306, user, password: password || '', database
                });
                result = await fetchMysqlSchema(host, port, user, password, database);
                // Re-create connection for persistent use (fetchMysqlSchema closes its own)
                connection = await mysql.createConnection({
                    host, port: parseInt(port) || 3306, user, password: password || '', database
                });
                break;
            }
            case 'postgres':
            case 'postgresql': {
                result = await fetchPostgresSchema(host, port, user, password, database);
                connection = new PgClient({
                    host, port: parseInt(port) || 5432, user, password: password || '', database
                });
                await connection.connect();
                break;
            }
            case 'mssql':
            case 'sqlserver': {
                const config = {
                    server: host, port: parseInt(port) || 1433, database,
                    options: { encrypt: false, trustServerCertificate: true }
                };
                if (user) { config.user = user; config.password = password || ''; }
                else { config.options.trustedConnection = true; }
                result = await fetchMssqlSchema(host, port, user, password, database);
                connection = await mssql.connect(config);
                break;
            }
            default:
                return res.status(400).json({ error: 'Unsupported database type: ' + dbType });
        }

        const sessionId = crypto.randomUUID();
        const session = {
            connection, dbType: type, database, version: result.version,
            schema: result.schema, lastActivity: Date.now(), timeoutHandle: null
        };
        connectionPool.set(sessionId, session);
        resetIdleTimer(sessionId);

        res.json({
            sessionId, database, version: result.version,
            tableCount: Object.keys(result.schema).length,
            schema: result.schema
        });
    } catch (err) {
        console.error('Connect error:', err.message);
        res.status(500).json({ error: err.message });
    }
});
```

- [ ] **Step 3: Add POST /api/disconnect endpoint**

```javascript
app.post('/api/disconnect', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || !connectionPool.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found.' });
    }
    await closeSession(sessionId);
    res.json({ disconnected: true });
});
```

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add connection pool manager with /api/connect and /api/disconnect"
```

---

### Task 3: Server — Type Conversion Engine

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add the type conversion map and converter function**

Add after the connection pool code:

```javascript
/* ================================================================
   Cross-Engine Type Conversion
   ================================================================ */
const TYPE_CONVERSIONS = {
    // MySQL → PostgreSQL
    'mysql>postgres': {
        'tinyint(1)': { targetType: 'boolean', convert: v => v === 1 || v === '1' || v === true },
        'tinyint': { targetType: 'smallint', convert: v => v },
        'double': { targetType: 'double precision', convert: v => v },
        'datetime': { targetType: 'timestamp', convert: v => v },
        'longtext': { targetType: 'text', convert: v => v },
        'mediumtext': { targetType: 'text', convert: v => v },
    },
    // PostgreSQL → MySQL
    'postgres>mysql': {
        'boolean': { targetType: 'tinyint(1)', convert: v => v ? 1 : 0 },
        'serial': { targetType: 'int', skip: true },
        'bigserial': { targetType: 'bigint', skip: true },
        'double precision': { targetType: 'double', convert: v => v },
        'timestamp without time zone': { targetType: 'datetime', convert: v => v },
        'timestamp with time zone': { targetType: 'datetime', convert: v => v },
        'jsonb': { targetType: 'json', convert: v => typeof v === 'string' ? v : JSON.stringify(v) },
    },
    // MySQL → SQL Server
    'mysql>mssql': {
        'tinyint(1)': { targetType: 'bit', convert: v => v ? 1 : 0 },
        'text': { targetType: 'nvarchar(max)', convert: v => v },
        'longtext': { targetType: 'nvarchar(max)', convert: v => v },
        'double': { targetType: 'float', convert: v => v },
        'datetime': { targetType: 'datetime2', convert: v => v },
    },
    // SQL Server → MySQL
    'mssql>mysql': {
        'bit': { targetType: 'tinyint(1)', convert: v => v ? 1 : 0 },
        'nvarchar': { targetType: 'varchar', convert: v => v },
        'datetime2': { targetType: 'datetime', convert: v => v },
        'uniqueidentifier': { targetType: 'varchar(36)', convert: v => String(v) },
        'money': { targetType: 'decimal(19,4)', convert: v => v },
    },
    // SQL Server → PostgreSQL
    'mssql>postgres': {
        'bit': { targetType: 'boolean', convert: v => !!v },
        'nvarchar': { targetType: 'varchar', convert: v => v },
        'datetime2': { targetType: 'timestamp', convert: v => v },
        'uniqueidentifier': { targetType: 'varchar(36)', convert: v => String(v) },
        'money': { targetType: 'numeric(19,4)', convert: v => v },
    },
    // PostgreSQL → SQL Server
    'postgres>mssql': {
        'boolean': { targetType: 'bit', convert: v => v ? 1 : 0 },
        'serial': { targetType: 'int', skip: true },
        'text': { targetType: 'nvarchar(max)', convert: v => v },
        'jsonb': { targetType: 'nvarchar(max)', convert: v => typeof v === 'string' ? v : JSON.stringify(v) },
        'json': { targetType: 'nvarchar(max)', convert: v => typeof v === 'string' ? v : JSON.stringify(v) },
    }
};

function getConversion(sourceDbType, targetDbType, sourceColType) {
    const key = sourceDbType.replace('mariadb','mysql').replace('postgresql','postgres').replace('sqlserver','mssql')
        + '>' + targetDbType.replace('mariadb','mysql').replace('postgresql','postgres').replace('sqlserver','mssql');
    const map = TYPE_CONVERSIONS[key] || {};
    const normalizedType = sourceColType.toLowerCase().trim();
    // Try exact match, then base type (strip size)
    return map[normalizedType] || map[normalizedType.replace(/\(.*\)/, '')] || { convert: v => v };
}

function shouldSkipColumn(sourceDbType, targetDbType, sourceColType, isAutoIncrement) {
    // Skip auto-increment/serial/identity columns — let the target DB handle them
    if (isAutoIncrement) return true;
    const conv = getConversion(sourceDbType, targetDbType, sourceColType);
    return !!conv.skip;
}
```

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat: add cross-engine type conversion map and converter"
```

---

### Task 4: Server — Migration Execution Engine

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add migration state storage**

```javascript
const migrations = new Map(); // migrationId → { status, tables, currentTable, error, cancelFlag }
```

- [ ] **Step 2: Add POST /api/migrate endpoint**

```javascript
app.post('/api/migrate', async (req, res) => {
    const { sourceSessionId, targetSessionId, tables } = req.body;
    const source = connectionPool.get(sourceSessionId);
    const target = connectionPool.get(targetSessionId);

    if (!source) return res.status(404).json({ error: 'Source session not found or expired.' });
    if (!target) return res.status(404).json({ error: 'Target session not found or expired.' });
    if (!tables || tables.length === 0) return res.status(400).json({ error: 'No tables specified.' });

    const migrationId = crypto.randomUUID();
    const migrationState = {
        status: 'running',
        tables: tables.map(t => ({ name: t.name, totalRows: 0, migratedRows: 0, status: 'pending', time: 0, error: null })),
        currentTable: null,
        error: null,
        cancelFlag: false
    };
    migrations.set(migrationId, migrationState);

    // Run migration in background (don't await)
    runMigration(migrationId, source, target, tables, migrationState).catch(err => {
        migrationState.status = 'error';
        migrationState.error = err.message;
    });

    res.json({ migrationId });
});
```

- [ ] **Step 3: Add the runMigration function**

```javascript
async function runMigration(migrationId, source, target, tables, state) {
    const BATCH_SIZE = 500;

    for (let i = 0; i < tables.length; i++) {
        if (state.cancelFlag) {
            for (let j = i; j < tables.length; j++) state.tables[j].status = 'cancelled';
            break;
        }

        const tableConfig = tables[i];
        const tableState = state.tables[i];
        tableState.status = 'running';
        state.currentTable = tableConfig.name;
        const startTime = Date.now();

        try {
            resetIdleTimer(source.sessionId || '');
            resetIdleTimer(target.sessionId || '');

            // Get row count
            const count = await getRowCount(source, tableConfig.name);
            tableState.totalRows = count;

            // Truncate if strategy requires
            if (tableConfig.strategy === 'truncate') {
                await truncateTable(target, tableConfig.name);
            }

            // Disable FK checks on target
            await disableFKChecks(target);

            // Migrate in batches
            let offset = 0;
            while (offset < count) {
                if (state.cancelFlag) {
                    tableState.status = 'cancelled';
                    break;
                }

                const rows = await readBatch(source, tableConfig.name, BATCH_SIZE, offset);
                if (rows.length === 0) break;

                const convertedRows = rows.map(row => convertRow(row, tableConfig.columnMap, source.dbType, target.dbType));
                await writeBatch(target, tableConfig.name, convertedRows, tableConfig.strategy, tableConfig.columnMap);

                offset += rows.length;
                tableState.migratedRows = offset;
            }

            // Re-enable FK checks
            await enableFKChecks(target);

            if (tableState.status !== 'cancelled') {
                tableState.status = 'done';
            }
        } catch (err) {
            tableState.status = 'error';
            tableState.error = err.message;
            try { await enableFKChecks(target); } catch(e) {}
        }

        tableState.time = Date.now() - startTime;
    }

    state.currentTable = null;
    if (!state.cancelFlag && state.tables.every(t => t.status === 'done' || t.status === 'error')) {
        state.status = 'complete';
    } else if (state.cancelFlag) {
        state.status = 'cancelled';
    }
}
```

- [ ] **Step 4: Add helper functions (getRowCount, readBatch, writeBatch, convertRow, FK checks, truncate)**

```javascript
async function getRowCount(session, tableName) {
    const q = `SELECT COUNT(*) as cnt FROM ${quoteIdentifier(session.dbType, tableName)}`;
    if (session.dbType === 'mysql' || session.dbType === 'mariadb') {
        const [rows] = await session.connection.query(q);
        return rows[0].cnt;
    } else if (session.dbType === 'postgres' || session.dbType === 'postgresql') {
        const result = await session.connection.query(q);
        return parseInt(result.rows[0].cnt);
    } else {
        const result = await session.connection.request().query(q);
        return result.recordset[0].cnt;
    }
}

async function readBatch(session, tableName, limit, offset) {
    const table = quoteIdentifier(session.dbType, tableName);
    let q;
    if (session.dbType === 'mssql' || session.dbType === 'sqlserver') {
        q = `SELECT * FROM ${table} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    } else {
        q = `SELECT * FROM ${table} LIMIT ${limit} OFFSET ${offset}`;
    }

    if (session.dbType === 'mysql' || session.dbType === 'mariadb') {
        const [rows] = await session.connection.query(q);
        return rows;
    } else if (session.dbType === 'postgres' || session.dbType === 'postgresql') {
        const result = await session.connection.query(q);
        return result.rows;
    } else {
        const result = await session.connection.request().query(q);
        return result.recordset;
    }
}

function convertRow(row, columnMap, sourceDbType, targetDbType) {
    const result = {};
    for (const col of columnMap) {
        if (col.skip) continue;
        const value = row[col.sourceCol];
        if (value === null || value === undefined) {
            result[col.targetCol] = null;
        } else {
            const conv = getConversion(sourceDbType, targetDbType, col.sourceType);
            result[col.targetCol] = conv.convert(value);
        }
    }
    return result;
}

async function writeBatch(session, tableName, rows, strategy, columnMap) {
    if (rows.length === 0) return;
    const table = quoteIdentifier(session.dbType, tableName);
    const cols = columnMap.filter(c => !c.skip).map(c => c.targetCol);
    const quotedCols = cols.map(c => quoteIdentifier(session.dbType, c));

    for (const row of rows) {
        const values = cols.map(c => row[c]);

        if (session.dbType === 'mysql' || session.dbType === 'mariadb') {
            const placeholders = cols.map(() => '?').join(', ');
            if (strategy === 'upsert') {
                const updates = quotedCols.map(c => `${c} = VALUES(${c})`).join(', ');
                await session.connection.query(
                    `INSERT INTO ${table} (${quotedCols.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
                    values
                );
            } else {
                await session.connection.query(
                    `INSERT IGNORE INTO ${table} (${quotedCols.join(', ')}) VALUES (${placeholders})`,
                    values
                );
            }
        } else if (session.dbType === 'postgres' || session.dbType === 'postgresql') {
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            const pkCols = columnMap.filter(c => c.isPK && !c.skip).map(c => quoteIdentifier(session.dbType, c.targetCol));
            if (strategy === 'upsert' && pkCols.length > 0) {
                const updates = quotedCols.filter(c => !pkCols.includes(c)).map(c => `${c} = EXCLUDED.${c}`).join(', ');
                await session.connection.query(
                    `INSERT INTO ${table} (${quotedCols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${pkCols.join(', ')}) DO UPDATE SET ${updates}`,
                    values
                );
            } else {
                const onConflict = pkCols.length > 0 ? ` ON CONFLICT (${pkCols.join(', ')}) DO NOTHING` : '';
                await session.connection.query(
                    `INSERT INTO ${table} (${quotedCols.join(', ')}) VALUES (${placeholders})${onConflict}`,
                    values
                );
            }
        } else {
            // SQL Server — use MERGE for upsert, simple INSERT for insert-only
            const valuesStr = values.map(v => v === null ? 'NULL' : typeof v === 'string' ? `N'${v.replace(/'/g, "''")}'` : v).join(', ');
            if (strategy === 'upsert') {
                // Simple approach: try INSERT, if fails try UPDATE
                try {
                    await session.connection.request().query(
                        `INSERT INTO ${table} (${quotedCols.join(', ')}) VALUES (${valuesStr})`
                    );
                } catch (e) {
                    if (e.number === 2627 || e.number === 2601) {
                        // Duplicate key — update instead
                        const pkCol = columnMap.find(c => c.isPK && !c.skip);
                        if (pkCol) {
                            const setClause = quotedCols.map((c, i) => `${c} = ${values[i] === null ? 'NULL' : typeof values[i] === 'string' ? `N'${values[i].replace(/'/g, "''")}'` : values[i]}`).join(', ');
                            const pkValue = row[pkCol.targetCol];
                            await session.connection.request().query(
                                `UPDATE ${table} SET ${setClause} WHERE ${quoteIdentifier(session.dbType, pkCol.targetCol)} = ${typeof pkValue === 'string' ? `N'${pkValue.replace(/'/g, "''")}'` : pkValue}`
                            );
                        }
                    } else { throw e; }
                }
            } else {
                try {
                    await session.connection.request().query(
                        `INSERT INTO ${table} (${quotedCols.join(', ')}) VALUES (${valuesStr})`
                    );
                } catch (e) {
                    if (e.number !== 2627 && e.number !== 2601) throw e;
                    // Duplicate — skip for insert-only strategy
                }
            }
        }
    }
}

async function truncateTable(session, tableName) {
    const table = quoteIdentifier(session.dbType, tableName);
    const q = `DELETE FROM ${table}`;
    if (session.dbType === 'mysql' || session.dbType === 'mariadb') {
        await session.connection.query(q);
    } else if (session.dbType === 'postgres' || session.dbType === 'postgresql') {
        await session.connection.query(q);
    } else {
        await session.connection.request().query(q);
    }
}

async function disableFKChecks(session) {
    if (session.dbType === 'mysql' || session.dbType === 'mariadb') {
        await session.connection.query('SET FOREIGN_KEY_CHECKS = 0');
    } else if (session.dbType === 'postgres' || session.dbType === 'postgresql') {
        await session.connection.query("SET session_replication_role = 'replica'");
    }
    // SQL Server: handled per-table if needed
}

async function enableFKChecks(session) {
    if (session.dbType === 'mysql' || session.dbType === 'mariadb') {
        await session.connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } else if (session.dbType === 'postgres' || session.dbType === 'postgresql') {
        await session.connection.query("SET session_replication_role = 'origin'");
    }
}

function quoteIdentifier(dbType, name) {
    if (dbType === 'mysql' || dbType === 'mariadb') return '`' + name + '`';
    if (dbType === 'postgres' || dbType === 'postgresql') return '"' + name + '"';
    return '[' + name + ']';
}
```

- [ ] **Step 5: Add status and cancel endpoints**

```javascript
app.get('/api/migrate/:id/status', (req, res) => {
    const state = migrations.get(req.params.id);
    if (!state) return res.status(404).json({ error: 'Migration not found.' });
    resetIdleTimer(req.query.sourceSessionId || '');
    resetIdleTimer(req.query.targetSessionId || '');
    res.json({
        status: state.status,
        currentTable: state.currentTable,
        tables: state.tables,
        error: state.error
    });
});

app.post('/api/migrate/:id/cancel', (req, res) => {
    const state = migrations.get(req.params.id);
    if (!state) return res.status(404).json({ error: 'Migration not found.' });
    state.cancelFlag = true;
    res.json({ cancelled: true });
});
```

- [ ] **Step 6: Commit**

```bash
git add server.js
git commit -m "feat: add migration execution engine with batch read/write and progress tracking"
```

---

### Task 5: Create Migration Page — Step 1 (Connect)

**Files:**
- Create: `public/dynamic-migrate.html`

- [ ] **Step 1: Create the full page structure with Step 1 UI**

Create `public/dynamic-migrate.html` — a complete self-contained HTML page with:

- All CSS inline (global nav, theme variables + light overrides, toast, step indicator, connection panels)
- Global nav bar with Migrate tab active (all 7 tabs)
- Theme toggle button + JS
- Toast notification system
- Database badge + tab visibility IIFEs
- A **step indicator bar** at the top showing: `1. Connect → 2. Configure → 3. Review → 4. Execute` with the active step highlighted
- **Step 1 content:** Two side-by-side connection panels (Source A / Target B), each with:
  - Database type selector
  - Connection fields (host, port, user, password, database)
  - "Connect" button that calls `POST /api/connect`
  - Confirmation badge on success
- A "Next" button (disabled until both connected)
- State variables: `sourceSession`, `targetSession`, `currentStep = 1`

Step indicator CSS:
```css
.step-bar { display: flex; justify-content: center; gap: 8px; padding: 16px; border-bottom: 1px solid var(--border); }
.step { padding: 8px 20px; border-radius: 20px; font-size: 13px; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border); }
.step.active { color: var(--accent); border-color: var(--accent); background: var(--accent-bg); }
.step.done { color: #22c55e; border-color: #22c55e; }
```

Connection panel CSS (reuse pattern from diff page):
```css
.migrate-container { max-width: 1400px; margin: 0 auto; padding: 20px; }
.step-content { display: none; }
.step-content.active { display: block; }
.connect-panels { display: flex; gap: 20px; }
.connect-panel { flex: 1; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
/* Form fields, badges, buttons — same as diff page */
```

Navigation buttons:
```css
.step-nav { display: flex; justify-content: center; gap: 12px; margin-top: 24px; }
.step-nav button { padding: 10px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-next { background: var(--accent); color: #fff; border: none; }
.btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-back { background: none; border: 1px solid var(--border); color: var(--text-secondary); }
```

JS: `goToStep(n)` function that shows/hides step content and updates the step indicator.

- [ ] **Step 2: Commit**

```bash
git add public/dynamic-migrate.html
git commit -m "feat: create migration page with Step 1 (connect source and target)"
```

---

### Task 6: Migration Page — Step 2 (Configure)

**Files:**
- Modify: `public/dynamic-migrate.html`

- [ ] **Step 1: Add Step 2 HTML and CSS**

Step 2 content area with:
- Table selector: checkboxes for all matched tables (source tables that exist in target)
- Select All / None toggle
- Table count summary
- Per-table expandable settings:
  - Conflict strategy dropdown (Insert only / Upsert / Truncate & replace)
  - Column mapping table (source col → target col, with type and status indicator)

CSS for the table selector and column mapping:
```css
.table-selector { margin-bottom: 20px; }
.table-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.table-row:hover { background: var(--bg-hover); }
.table-row.expanded { background: var(--accent-bg); }
.table-settings { padding: 16px; background: var(--bg-primary); border-bottom: 1px solid var(--border); }
.column-map { width: 100%; font-size: 12px; border-collapse: collapse; }
.column-map th { text-align: left; padding: 6px 10px; color: var(--text-secondary); border-bottom: 1px solid var(--border); }
.column-map td { padding: 6px 10px; border-bottom: 1px solid var(--border-light); }
.status-ok { color: #22c55e; } .status-convert { color: #6366f1; } .status-warn { color: #eab308; } .status-skip { color: var(--text-muted); }
```

- [ ] **Step 2: Add Step 2 JS logic**

```javascript
function renderStep2() {
    var sourceSchema = sourceSession.schema;
    var targetSchema = targetSession.schema;
    var html = '<div class="table-selector">';
    html += '<div style="margin-bottom:12px"><label><input type="checkbox" id="selectAll" onchange="toggleAllMigrateTables(this.checked)"> Select All</label>';
    html += '<span style="margin-left:12px;color:var(--text-muted)" id="tableCount"></span></div>';

    migrationTables = [];
    for (var name of Object.keys(sourceSchema).sort()) {
        var targetTable = targetSchema[name] || targetSchema[name.toLowerCase()];
        var matched = !!targetTable;
        if (!matched) continue; // Skip source-only tables in Round 1

        var sourceTable = sourceSchema[name];
        var columnMap = buildColumnMap(name, sourceTable, targetTable);

        migrationTables.push({
            name: name,
            selected: true,
            strategy: 'insert',
            columnMap: columnMap
        });

        html += renderTableRow(name, sourceTable, targetTable, columnMap, migrationTables.length - 1);
    }
    html += '</div>';
    document.getElementById('step2Content').innerHTML = html;
    updateTableCount();
}

function buildColumnMap(tableName, sourceTable, targetTable) {
    var map = [];
    var targetCols = new Map(targetTable.columns.map(c => [c.name.toLowerCase(), c]));
    for (var col of sourceTable.columns) {
        var targetCol = targetCols.get(col.name.toLowerCase());
        var isPK = sourceTable.primary_keys.includes(col.name);
        var isAutoInc = col.auto_increment;
        var skip = !targetCol || shouldSkipColumn(sourceSession.dbType, targetSession.dbType, col.type, isAutoInc);
        map.push({
            sourceCol: col.name,
            sourceType: col.type,
            targetCol: targetCol ? targetCol.name : null,
            targetType: targetCol ? targetCol.type : null,
            isPK: isPK,
            skip: skip,
            status: !targetCol ? 'skip' : skip ? 'skip' : isCompatible(col.type, targetCol.type) ? 'ok' : 'convert'
        });
    }
    return map;
}
```

Note: `shouldSkipColumn` is defined on the server. For the client-side, duplicate the auto-increment skip logic:
```javascript
function shouldSkipColumnClient(sourceType, isAutoInc) {
    if (isAutoInc) return true;
    var t = sourceType.toLowerCase();
    return t === 'serial' || t === 'bigserial';
}
```

- [ ] **Step 3: Commit**

```bash
git add public/dynamic-migrate.html
git commit -m "feat: add Step 2 (configure tables, column mapping, conflict strategy)"
```

---

### Task 7: Migration Page — Step 3 (Review & Confirm)

**Files:**
- Modify: `public/dynamic-migrate.html`

- [ ] **Step 1: Add Step 3 HTML rendering**

```javascript
function renderStep3() {
    var selected = migrationTables.filter(t => t.selected);
    var totalRows = 'Estimating...';
    var html = '<div class="review-summary">';
    html += '<h2 style="color:var(--text-primary);margin-bottom:16px">Migration Summary</h2>';
    html += '<div class="review-info">';
    html += '<div><strong>Source:</strong> ' + esc(sourceSession.database) + ' (' + esc(sourceSession.version) + ')</div>';
    html += '<div><strong>Target:</strong> ' + esc(targetSession.database) + ' (' + esc(targetSession.version) + ')</div>';
    html += '<div><strong>Tables:</strong> ' + selected.length + ' selected</div>';
    html += '</div>';

    // Warnings
    var truncateTables = selected.filter(t => t.strategy === 'truncate');
    var skippedCols = selected.reduce((sum, t) => sum + t.columnMap.filter(c => c.skip).length, 0);

    if (truncateTables.length > 0 || skippedCols > 0) {
        html += '<div class="review-warnings">';
        if (truncateTables.length > 0) {
            html += '<div class="warning-item">⚠️ <strong>Truncate & Replace:</strong> ALL existing data will be DELETED from: ' + truncateTables.map(t => esc(t.name)).join(', ') + '</div>';
        }
        if (skippedCols > 0) {
            html += '<div class="warning-item">⚠️ <strong>' + skippedCols + ' columns</strong> will be skipped (auto-increment or no target match)</div>';
        }
        if (sourceSession.dbType !== targetSession.dbType) {
            html += '<div class="warning-item">⚠️ <strong>Cross-engine migration</strong> — type conversions will be applied</div>';
        }
        html += '</div>';
    }

    // Per-table breakdown
    html += '<table class="review-table"><thead><tr><th>Table</th><th>Strategy</th><th>Columns</th><th>Skipped</th></tr></thead><tbody>';
    for (var t of selected) {
        var mappedCols = t.columnMap.filter(c => !c.skip).length;
        var skipped = t.columnMap.filter(c => c.skip).length;
        var stratLabel = t.strategy === 'insert' ? 'Insert only' : t.strategy === 'upsert' ? 'Upsert' : '⚠️ Truncate & replace';
        html += '<tr><td>' + esc(t.name) + '</td><td>' + stratLabel + '</td><td>' + mappedCols + '</td><td>' + skipped + '</td></tr>';
    }
    html += '</tbody></table>';

    // Confirmation
    html += '<div class="confirm-section">';
    html += '<label class="confirm-check"><input type="checkbox" id="confirmCheck" onchange="updateConfirmButton()"> I understand that this will modify data in the target database and this action cannot be automatically undone</label>';
    html += '<div class="confirm-input"><label>Type the target database name to confirm: <strong>' + esc(targetSession.database) + '</strong></label>';
    html += '<input type="text" id="confirmName" oninput="updateConfirmButton()" placeholder="Type database name..."></div>';
    html += '</div>';
    html += '</div>';

    document.getElementById('step3Content').innerHTML = html;
}

function updateConfirmButton() {
    var checked = document.getElementById('confirmCheck').checked;
    var name = document.getElementById('confirmName').value.trim();
    var matches = name === targetSession.database;
    document.getElementById('startMigrationBtn').disabled = !(checked && matches);
}
```

CSS for review:
```css
.review-summary { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; max-width: 800px; margin: 0 auto; }
.review-info { margin-bottom: 16px; color: var(--text-secondary); line-height: 1.8; }
.review-warnings { background: rgba(234,179,8,0.08); border: 1px solid #eab308; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.warning-item { padding: 4px 0; font-size: 13px; color: #eab308; }
.review-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
.review-table th { text-align: left; padding: 8px 12px; border-bottom: 2px solid var(--border); color: var(--text-secondary); }
.review-table td { padding: 8px 12px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
.confirm-section { border-top: 1px solid var(--border); padding-top: 20px; margin-top: 20px; }
.confirm-check { display: block; margin-bottom: 16px; font-size: 14px; color: var(--text-primary); cursor: pointer; }
.confirm-input label { display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary); }
.confirm-input input { width: 100%; padding: 10px 14px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 14px; }
```

- [ ] **Step 2: Commit**

```bash
git add public/dynamic-migrate.html
git commit -m "feat: add Step 3 (review summary with mandatory confirmation)"
```

---

### Task 8: Migration Page — Step 4 (Execute with Progress)

**Files:**
- Modify: `public/dynamic-migrate.html`

- [ ] **Step 1: Add Step 4 HTML and progress polling**

```javascript
var pollInterval = null;

async function startMigration() {
    var selected = migrationTables.filter(t => t.selected);
    var payload = {
        sourceSessionId: sourceSession.sessionId,
        targetSessionId: targetSession.sessionId,
        tables: selected.map(t => ({
            name: t.name,
            strategy: t.strategy,
            columnMap: t.columnMap
        }))
    };

    try {
        var res = await fetch('/api/migrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.error) { showToast('Error: ' + data.error); return; }

        currentMigrationId = data.migrationId;
        sessionStorage.setItem('dbdiagram_migrate_session', 'active');
        goToStep(4);
        startPolling();
    } catch (err) {
        showToast('Failed to start migration: ' + err.message);
    }
}

function startPolling() {
    pollInterval = setInterval(async () => {
        try {
            var res = await fetch('/api/migrate/' + currentMigrationId + '/status');
            var data = await res.json();
            renderProgress(data);
            if (data.status === 'complete' || data.status === 'error' || data.status === 'cancelled') {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        } catch (err) { /* retry on next poll */ }
    }, 500);
}

async function cancelMigration() {
    if (!currentMigrationId) return;
    await fetch('/api/migrate/' + currentMigrationId + '/cancel', { method: 'POST' });
    showToast('Cancelling after current batch...');
}

function renderProgress(data) {
    var html = '';
    var doneTables = data.tables.filter(t => t.status === 'done').length;
    var totalTables = data.tables.length;
    var overallPct = totalTables > 0 ? Math.round(doneTables / totalTables * 100) : 0;

    if (data.status === 'complete' || data.status === 'cancelled') {
        // Completion screen
        var successCount = data.tables.filter(t => t.status === 'done').length;
        var errorCount = data.tables.filter(t => t.status === 'error').length;
        var cancelCount = data.tables.filter(t => t.status === 'cancelled').length;
        var totalRows = data.tables.filter(t => t.status === 'done').reduce((s, t) => s + t.migratedRows, 0);
        var totalTime = data.tables.reduce((s, t) => s + (t.time || 0), 0);

        html += '<div class="complete-summary">';
        html += '<h2>' + (data.status === 'complete' ? '✅ Migration Complete' : '⏹ Migration Cancelled') + '</h2>';
        html += '<div class="complete-stats">';
        html += '<div>' + totalTables + ' tables processed in ' + (totalTime / 1000).toFixed(1) + 's</div>';
        if (successCount > 0) html += '<div class="stat-done">✅ ' + successCount + ' successful (' + totalRows.toLocaleString() + ' rows)</div>';
        if (errorCount > 0) html += '<div class="stat-error">❌ ' + errorCount + ' failed</div>';
        if (cancelCount > 0) html += '<div class="stat-cancel">⏹ ' + cancelCount + ' cancelled</div>';
        html += '</div>';

        // Error details
        var errorTables = data.tables.filter(t => t.status === 'error');
        if (errorTables.length > 0) {
            html += '<div class="error-details"><h3>Error Details</h3>';
            for (var t of errorTables) {
                html += '<div class="error-item"><strong>' + esc(t.name) + ':</strong> ' + esc(t.error) + '</div>';
            }
            html += '</div>';
        }

        html += '<div class="step-nav"><button class="btn-next" onclick="window.location.href=\'/\'">Done</button></div>';
        html += '</div>';
    } else {
        // Running progress
        var current = data.tables.find(t => t.status === 'running');
        html += '<div class="progress-section">';
        html += '<h2>Migration in Progress...</h2>';
        html += '<div class="progress-overall">Overall: ' + doneTables + ' of ' + totalTables + ' tables (' + overallPct + '%)</div>';
        html += '<div class="progress-bar"><div class="progress-fill" style="width:' + overallPct + '%"></div></div>';

        if (current) {
            var curPct = current.totalRows > 0 ? Math.round(current.migratedRows / current.totalRows * 100) : 0;
            html += '<div class="progress-current">' + esc(current.name) + ': ' + current.migratedRows.toLocaleString() + ' of ' + current.totalRows.toLocaleString() + ' rows (' + curPct + '%)</div>';
            html += '<div class="progress-bar"><div class="progress-fill accent" style="width:' + curPct + '%"></div></div>';
        }

        // Per-table status
        html += '<table class="progress-table"><thead><tr><th></th><th>Table</th><th>Rows</th><th>Status</th><th>Time</th></tr></thead><tbody>';
        for (var t of data.tables) {
            var icon = t.status === 'done' ? '✅' : t.status === 'running' ? '🔄' : t.status === 'error' ? '❌' : t.status === 'cancelled' ? '⏹' : '⏳';
            var rowsText = t.status === 'running' ? t.migratedRows.toLocaleString() + '/' + t.totalRows.toLocaleString() : t.status === 'done' ? t.migratedRows.toLocaleString() : t.totalRows > 0 ? t.totalRows.toLocaleString() : '—';
            var timeText = t.time > 0 ? (t.time / 1000).toFixed(1) + 's' : '—';
            html += '<tr><td>' + icon + '</td><td>' + esc(t.name) + '</td><td>' + rowsText + '</td><td>' + esc(t.status) + '</td><td>' + timeText + '</td></tr>';
        }
        html += '</tbody></table>';
        html += '<div class="step-nav"><button class="btn-back" onclick="cancelMigration()">Cancel Migration</button></div>';
        html += '</div>';
    }

    document.getElementById('step4Content').innerHTML = html;
}
```

CSS for progress:
```css
.progress-section { max-width: 800px; margin: 0 auto; }
.progress-overall { font-size: 14px; color: var(--text-secondary); margin: 12px 0 6px; }
.progress-current { font-size: 13px; color: var(--text-secondary); margin: 12px 0 6px; }
.progress-bar { height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
.progress-fill { height: 100%; background: #22c55e; border-radius: 4px; transition: width 0.3s; }
.progress-fill.accent { background: var(--accent); }
.progress-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
.progress-table th { text-align: left; padding: 8px 12px; border-bottom: 2px solid var(--border); color: var(--text-secondary); }
.progress-table td { padding: 8px 12px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
.complete-summary { text-align: center; max-width: 600px; margin: 40px auto; }
.complete-stats { margin: 16px 0; line-height: 2; }
.stat-done { color: #22c55e; } .stat-error { color: #ef4444; } .stat-cancel { color: var(--text-muted); }
.error-details { text-align: left; background: rgba(239,68,68,0.08); border: 1px solid #ef4444; border-radius: 8px; padding: 12px 16px; margin: 16px 0; }
.error-item { padding: 4px 0; font-size: 13px; color: #fca5a5; }
```

- [ ] **Step 2: Commit**

```bash
git add public/dynamic-migrate.html
git commit -m "feat: add Step 4 (execute with live progress, cancel, completion screen)"
```

---

### Task 9: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Data Migration to README**

Add a new section after "Schema Comparison":

```markdown
### Data Migration
- **Live Migration** — Migrate data between any combination of MySQL, PostgreSQL, and SQL Server databases with a guided 4-step wizard
- **Cross-Engine Support** — Automatic type conversion when migrating between different database engines (e.g., MySQL tinyint(1) → PostgreSQL boolean)
- **Per-Table Control** — Choose conflict strategy per table: insert only, upsert (insert or update), or truncate & replace
- **Column Mapping** — Automatic column matching with visual type compatibility indicators and the ability to skip or remap columns
- **Safety First** — Mandatory review step with full migration summary, explicit confirmation (checkbox + type database name), per-table transactions, and cancel support
- **Live Progress** — Real-time progress tracking with per-table status, row counts, and error reporting
```

Update Project Structure to include `dynamic-migrate.html`.

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: add data migration feature to README"
git push
```
