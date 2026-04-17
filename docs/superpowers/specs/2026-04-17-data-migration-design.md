# Live Data Migration — Design Spec

**Date:** 2026-04-17
**Scope:** Round 1 — Core migration pipeline with cross-engine support

## Overview

A new dedicated page (`dynamic-migrate.html`) with a 4-step wizard that connects to two databases (any engine combination), lets the user select tables, configure column mappings and conflict strategies, review a full summary with mandatory confirmation, and execute the migration with live progress tracking.

**This is the first feature that WRITES to a database.** Safety is the top priority: mandatory review step, explicit confirmation (checkbox + type database name), per-table transactions, cancel support, and error isolation.

---

## Page Structure: 4-Step Wizard

```
Step 1: Connect       →  Step 2: Configure    →  Step 3: Review    →  Step 4: Execute
[Source A] [Target B]    [Tables, columns,       [Summary, warnings,  [Progress bars,
                          mapping, strategy]       MUST confirm]        errors, cancel]
```

Steps are sequential — the user can go back but not skip forward. Each step must be completed before "Next" is enabled.

---

## Step 1: Connect Source and Target

### UI

Two side-by-side connection panels:

**Source (A) — "Read from":**
- Database type selector: MySQL, PostgreSQL, SQL Server
- Connection fields: host, port, user, password, database
- "Connect" button
- Confirmation badge on success: `mydb — 35 tables — MySQL 8.0`

**Target (B) — "Write to":**
- Same fields
- Can be a different engine than source (cross-engine migration)
- Confirmation badge on success

**"Next" button** — enabled when both connections are established.

### Server: Persistent Connection Sessions

Current `/api/schema` connects, reads, and disconnects. Migration needs persistent connections to read data later. New endpoints:

**`POST /api/connect`**
- Body: `{ dbType, host, port, user, password, database }`
- Creates a database connection and stores it in a server-side connection pool
- Returns: `{ sessionId, database, version, tableCount, schema }`
- The `sessionId` is a random UUID used to reference this connection in subsequent calls
- Connections auto-close after 10 minutes of inactivity (idle timeout)

**`POST /api/disconnect`**
- Body: `{ sessionId }`
- Explicitly closes and removes the connection from the pool
- Called when the user leaves the page or cancels

### Server: Connection Pool Manager

```javascript
const connectionPool = new Map(); // sessionId → { connection, dbType, lastActivity, timeout }
```

- Each entry stores: the database connection object, the dbType, and a setTimeout handle for idle cleanup
- On every API call that uses a sessionId, reset the idle timer
- Max 10 concurrent sessions (reject with error if exceeded)
- On server shutdown, close all connections

---

## Step 2: Configure Migration

### Table Selector

Left column listing all source tables with checkboxes:

- **Matched tables** (exist in both source and target by name, case-insensitive): pre-checked, shown normally
- **Source-only tables** (no match in target): unchecked, shown with warning "No matching table in target" — can still be checked but will require the target table to be created (out of scope for Round 1 — show a disabled state with "Target table does not exist")
- **Select All / None** toggle at the top
- Table count summary: "8 of 35 tables selected"

### Per-Table Settings

Clicking a selected table expands an inline settings panel:

**Conflict strategy dropdown:**
- `Insert only` — `INSERT` new rows, skip if PK already exists in target. Uses `INSERT IGNORE` (MySQL), `ON CONFLICT DO NOTHING` (PostgreSQL), or `IF NOT EXISTS` pattern (SQL Server).
- `Upsert` — `INSERT` or `UPDATE` on PK match. Uses `INSERT ... ON DUPLICATE KEY UPDATE` (MySQL), `INSERT ... ON CONFLICT DO UPDATE` (PostgreSQL), or `MERGE` (SQL Server).
- `Truncate & replace` — `TRUNCATE` target table first, then `INSERT` all rows. Shows ⚠️ warning icon.

Default: `Insert only` (safest).

**Column mapping table:**

| Source Column | Source Type | → | Target Column | Target Type | Status |
|---|---|---|---|---|---|
| id | int | → | id | integer | ✓ Auto-convert |
| email | varchar(255) | → | email | varchar(255) | ✓ Direct |
| is_active | tinyint(1) | → | is_active | boolean | ✓ Convert |
| legacy_field | text | → | — | — | ⚠️ Skip |

- Columns auto-matched by name (case-insensitive)
- Unmatched source columns default to "Skip"
- User can change target column mapping via dropdown (list of target table's columns)
- Status indicators:
  - ✓ Green: compatible type, no conversion needed
  - ✓ Blue: auto-conversion available (e.g., tinyint→boolean)
  - ⚠️ Yellow: lossy conversion (e.g., varchar(500)→varchar(255))
  - ⚠️ Gray: skipped (no target mapping)

**"Next" button** → moves to Step 3.

### Cross-Engine Type Conversion Map

Built into the server. Used to determine compatibility and convert values during migration:

| Source Type | Target Type | Conversion |
|---|---|---|
| MySQL `tinyint(1)` | PostgreSQL `boolean` | `0→false, 1→true` |
| MySQL `int auto_increment` | PostgreSQL `serial/integer` | Skip column on insert (let sequence handle it) |
| MySQL `datetime` | PostgreSQL `timestamp` | Direct (format compatible) |
| MySQL `text`/`longtext`/`mediumtext` | PostgreSQL `text` | Direct |
| MySQL `double` | PostgreSQL `double precision` | Direct |
| MySQL `decimal(M,N)` | PostgreSQL `numeric(M,N)` | Direct |
| MySQL `enum('a','b')` | PostgreSQL `varchar` | Extract value as string |
| PostgreSQL `boolean` | MySQL `tinyint(1)` | `false→0, true→1` |
| PostgreSQL `serial` | MySQL `int auto_increment` | Skip column on insert |
| PostgreSQL `jsonb`/`json` | MySQL `json`/`text` | Direct (JSON text) |
| PostgreSQL `text[]` | MySQL `text` | Join with comma |
| SQL Server `bit` | PostgreSQL `boolean` / MySQL `tinyint(1)` | Direct |
| SQL Server `nvarchar(N)` | MySQL `varchar(N)` / PostgreSQL `varchar(N)` | Direct (UTF-8) |
| SQL Server `identity` | MySQL `auto_increment` / PostgreSQL `serial` | Skip on insert |
| SQL Server `datetime2` | MySQL `datetime` / PostgreSQL `timestamp` | Direct |
| SQL Server `uniqueidentifier` | MySQL/PostgreSQL `varchar(36)` | Cast to string |

The conversion map is a JS object on the server. If a type pair isn't in the map, attempt direct insert and let the database handle it (most types are compatible enough).

---

## Step 3: Review & Confirm

### Summary Display

Shows a complete, read-only overview of the migration:

- **Source and Target** — database names, engines, hosts
- **Table count** — "12 of 35 tables selected"
- **Estimated total rows** — sum of approximate row counts
- **Per-table breakdown** — table name, estimated rows, conflict strategy, column mapping summary (N matched, N skipped, N converted)

### Warnings Section

Highlighted prominently (red/yellow background):

- ⚠️ Tables using "Truncate & replace" — explicit list with "ALL existing data will be DELETED"
- ⚠️ Lossy type conversions — columns where data could be truncated or lost
- ⚠️ Skipped columns — source columns with no target mapping
- ⚠️ Large tables (>10,000 rows) — estimated time warning
- ⚠️ Cross-engine migration — "Type conversions will be applied"

### Mandatory Confirmation

Three-part confirmation:

1. **Checkbox:** "I understand that this will modify data in the target database and this action cannot be automatically undone"
2. **Text input:** User must type the **exact target database name** (e.g., `mydb_production`)
3. **"Start Migration" button:** Only enabled when checkbox is checked AND typed name matches

**"Back" button** — returns to Step 2 for adjustments.

---

## Step 4: Execute with Progress

### Client-Side UI

**Overall progress bar:** "7 of 12 tables — 62%"

**Current table progress:** "orders — 8,450 of 15,000 rows — 56%"

**Per-table status table:**

| Status | Table | Rows | Strategy | Time |
|---|---|---|---|---|
| ✅ | users | 1,200 | Upsert | 1.2s |
| ✅ | roles | 8 | Insert only | 0.1s |
| 🔄 | orders | 8,450/15,000 | Insert only | 4.1s |
| ⏳ | order_items | 32,000 | Insert only | — |
| ⏳ | payments | 2,800 | Upsert | — |

**Cancel button:** Stops after the current batch. Already-committed tables are NOT rolled back.

### Server: Migration Execution

**`POST /api/migrate`**
- Body: `{ sourceSessionId, targetSessionId, tables: [{ name, strategy, columnMap: [{ sourceCol, targetCol, conversion }] }] }`
- Validates both sessions are active
- Starts migration in a background process
- Returns immediately: `{ migrationId }`

**`GET /api/migrate/:id/status`**
- Polled by the client every 500ms
- Returns:
```json
{
    "status": "running",
    "currentTable": "orders",
    "tables": [
        { "name": "users", "totalRows": 1200, "migratedRows": 1200, "status": "done", "time": 1200 },
        { "name": "orders", "totalRows": 15000, "migratedRows": 8450, "status": "running", "time": 4100 },
        { "name": "order_items", "totalRows": 32000, "migratedRows": 0, "status": "pending" }
    ],
    "error": null
}
```

**`POST /api/migrate/:id/cancel`**
- Sets a cancel flag on the migration
- Server checks the flag before each batch and stops if set
- Returns: `{ cancelled: true }`

### Migration Algorithm (Server-Side)

For each selected table, in dependency order (tables with no FK dependencies first):

1. **Get row count** from source: `SELECT COUNT(*) FROM table`
2. **If "Truncate & replace":** Execute `TRUNCATE TABLE target_table` (or `DELETE FROM` if TRUNCATE not supported with FKs)
3. **Disable FK checks on target** (temporarily, for the duration of this table's migration): MySQL: `SET FOREIGN_KEY_CHECKS = 0`, PostgreSQL: `SET session_replication_role = 'replica'`, SQL Server: `ALTER TABLE ... NOCHECK CONSTRAINT ALL`
4. **Read source rows in batches of 500:** `SELECT * FROM table LIMIT 500 OFFSET N`
5. **For each batch:**
   - Map columns according to the column mapping
   - Convert types according to the conversion map
   - Build INSERT/UPSERT statement for the target engine's dialect
   - Execute on target within a transaction
   - Update progress (migratedRows += batch size)
   - Check cancel flag
6. **Re-enable FK checks on target**
7. **If any batch fails:** Roll back the current table's transaction, record the error, continue to next table

### Dependency Ordering

Tables are migrated in FK dependency order:
- Tables with no FK dependencies first
- Tables that reference already-migrated tables next
- Circular dependencies (e.g., users ↔ departments): disable FK checks for the entire migration (already handled by step 3), then re-enable after all tables complete

### Error Handling

- **Per-table isolation:** Each table runs in its own transaction. A failure in one table does NOT affect others.
- **Error recording:** Failed tables store the error message, row number, and the SQL that failed.
- **Retry:** After migration completes, the user can retry failed tables individually.
- **Cancel:** Stops after current batch. Completed tables remain committed.

### Completion Screen

```
✅ Migration Complete

12 tables processed in 42 seconds
├── ✅ 10 successful (47,200 rows migrated)
├── ❌ 1 failed: order_items (FK constraint violation at row 1,523)
└── ⏹ 1 cancelled: payments

[View Error Details]  [Download Report]  [Retry Failed]  [Done]
```

- **View Error Details:** Expandable section showing error message + failing SQL
- **Download Report:** Markdown summary of the migration
- **Retry Failed:** Re-runs migration for only the failed tables
- **Done:** Returns to the index page, disconnects both sessions

---

## Nav Integration

### Migrate Tab

Add to all 6 existing pages (list, visual, analysis, diff, query, index):

```html
<a href="/dynamic-migrate.html" class="nav-tab migrate-tab" id="migrateTab">Migrate</a>
```

Dimmed by default (`.migrate-tab { opacity: 0.4; }`). Fully visible when a migration session is active (detected by checking `sessionStorage.getItem('dbdiagram_migrate_session')`).

---

## File Changes

| File | Changes |
|------|---------|
| `public/dynamic-migrate.html` | **New file** — 4-step migration wizard with connection panels, table selector, column mapping, review/confirm, progress tracking |
| `server.js` | **Major additions:** Connection pool manager, `/api/connect`, `/api/disconnect`, `/api/migrate`, `/api/migrate/:id/status`, `/api/migrate/:id/cancel`, type conversion engine, batch read/write logic, dependency ordering |
| `public/dynamic-list.html` | Add Migrate tab to nav |
| `public/dynamic-visual.html` | Add Migrate tab to nav |
| `public/dynamic-analysis.html` | Add Migrate tab to nav |
| `public/dynamic-diff.html` | Add Migrate tab to nav |
| `public/dynamic-query.html` | Add Migrate tab to nav |
| `public/index.html` | Add Migrate tab to nav (minimal version) |
| `README.md` | Add Data Migration to features list |

---

## Round 2 (Future)

Not in scope for this spec:
- Row preview grid with per-row selection
- WHERE clause filters per table
- Custom data transformation rules (regex, function-based value conversion)
- Schema migration (creating missing target tables automatically)
