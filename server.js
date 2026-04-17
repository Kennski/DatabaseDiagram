const express = require('express');
const mysql = require('mysql2/promise');
const { Client: PgClient } = require('pg');
const mssql = require('mssql');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Also serve the old static diagram pages from root
app.use(express.static(__dirname));

/* ================================================================
   Connection Pool Manager — persistent DB sessions for migration
   ================================================================ */
const connectionPool = new Map(); // sessionId → { connection, dbType, database, version, schema, lastActivity, timeoutHandle }
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SESSIONS = 10;

const migrations = new Map(); // migrationId → { status, tables, currentTable, error, cancelFlag }

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

/* ================================================================
   Helper: build the common schema object from raw query results
   ================================================================ */
function buildSchema(tables, columns, primaryKeys, indexes, foreignKeys) {
    const schema = {};

    for (const row of tables) {
        schema[row.TABLE_NAME] = { columns: [], primary_keys: [], keys: [], foreign_keys: [] };
    }

    for (const col of columns) {
        if (!schema[col.TABLE_NAME]) continue;
        // Deduplicate: skip if column name already exists for this table
        if (schema[col.TABLE_NAME].columns.some(c => c.name === col.COLUMN_NAME)) continue;
        schema[col.TABLE_NAME].columns.push({
            name: col.COLUMN_NAME,
            type: col.COLUMN_TYPE,
            nullable: col.IS_NULLABLE === 'YES',
            auto_increment: !!(col.AUTO_INCREMENT)
        });
    }

    for (const pk of primaryKeys) {
        if (!schema[pk.TABLE_NAME]) continue;
        if (!schema[pk.TABLE_NAME].primary_keys.includes(pk.COLUMN_NAME)) {
            schema[pk.TABLE_NAME].primary_keys.push(pk.COLUMN_NAME);
        }
    }

    const indexMap = {};
    for (const idx of indexes) {
        if (!schema[idx.TABLE_NAME]) continue;
        const key = `${idx.TABLE_NAME}::${idx.INDEX_NAME}`;
        if (!indexMap[key]) {
            indexMap[key] = { table: idx.TABLE_NAME, name: idx.INDEX_NAME, columns: [], unique: !!idx.IS_UNIQUE };
        }
        if (!indexMap[key].columns.includes(idx.COLUMN_NAME)) {
            indexMap[key].columns.push(idx.COLUMN_NAME);
        }
    }
    for (const idx of Object.values(indexMap)) {
        schema[idx.table].keys.push({ name: idx.name, columns: idx.columns, unique: idx.unique });
    }

    const fkMap = {};
    for (const fk of foreignKeys) {
        if (!schema[fk.TABLE_NAME]) continue;
        const key = `${fk.TABLE_NAME}::${fk.CONSTRAINT_NAME}`;
        if (!fkMap[key]) {
            fkMap[key] = {
                table: fk.TABLE_NAME, name: fk.CONSTRAINT_NAME,
                columns: [], ref_table: fk.REFERENCED_TABLE_NAME, ref_columns: [],
                actions: `ON UPDATE ${fk.UPDATE_RULE || 'NO ACTION'} ON DELETE ${fk.DELETE_RULE || 'NO ACTION'}`
            };
        }
        // Deduplicate: MariaDB INFORMATION_SCHEMA joins can return duplicate FK rows
        if (!fkMap[key].columns.includes(fk.COLUMN_NAME)) {
            fkMap[key].columns.push(fk.COLUMN_NAME);
            fkMap[key].ref_columns.push(fk.REFERENCED_COLUMN_NAME);
        }
    }
    for (const fk of Object.values(fkMap)) {
        schema[fk.table].foreign_keys.push({
            name: fk.name, columns: fk.columns,
            ref_table: fk.ref_table, ref_columns: fk.ref_columns, actions: fk.actions
        });
    }

    return schema;
}

/* ================================================================
   MySQL / MariaDB
   ================================================================ */
async function fetchMysqlSchema(host, port, user, password, database) {
    const connection = await mysql.createConnection({
        host, port: parseInt(port) || 3306, user, password: password || '', database
    });

    try {
        const [tables] = await connection.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`, [database]);

        const [columns] = await connection.query(
            `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, EXTRA
             FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?
             ORDER BY TABLE_NAME, ORDINAL_POSITION`, [database]);
        columns.forEach(c => { c.AUTO_INCREMENT = (c.EXTRA || '').includes('auto_increment'); });

        const [primaryKeys] = await connection.query(
            `SELECT tc.TABLE_NAME, kcu.COLUMN_NAME
             FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
             JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
               ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
             WHERE tc.TABLE_SCHEMA = ? AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
             ORDER BY tc.TABLE_NAME, kcu.ORDINAL_POSITION`, [database]);

        const [indexes] = await connection.query(
            `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
             FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = ? AND INDEX_NAME != 'PRIMARY'
             ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`, [database]);
        indexes.forEach(i => { i.IS_UNIQUE = i.NON_UNIQUE === 0; });

        const [foreignKeys] = await connection.query(
            `SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.COLUMN_NAME,
                    kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME,
                    rc.UPDATE_RULE, rc.DELETE_RULE
             FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
             JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
               ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
             JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
               ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
             WHERE tc.TABLE_SCHEMA = ? AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
             ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`, [database]);

        const [versionRows] = await connection.query('SELECT VERSION() as version');
        const version = versionRows[0]?.version || 'Unknown';

        return { schema: buildSchema(tables, columns, primaryKeys, indexes, foreignKeys), version };
    } finally {
        await connection.end();
    }
}

/* ================================================================
   PostgreSQL
   ================================================================ */
async function fetchPostgresSchema(host, port, user, password, database) {
    const pgSchema = 'public'; // default schema
    const client = new PgClient({
        host, port: parseInt(port) || 5432, user,
        password: password || '', database
    });
    await client.connect();

    try {
        const tablesRes = await client.query(
            `SELECT table_name AS "TABLE_NAME" FROM information_schema.tables
             WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`, [pgSchema]);

        const columnsRes = await client.query(
            `SELECT table_name AS "TABLE_NAME", column_name AS "COLUMN_NAME",
                    CASE WHEN character_maximum_length IS NOT NULL
                         THEN data_type || '(' || character_maximum_length || ')'
                         WHEN numeric_precision IS NOT NULL AND data_type NOT IN ('integer','smallint','bigint','real','double precision')
                         THEN data_type || '(' || numeric_precision || ',' || COALESCE(numeric_scale,0) || ')'
                         ELSE data_type END AS "COLUMN_TYPE",
                    is_nullable AS "IS_NULLABLE",
                    CASE WHEN column_default LIKE 'nextval%' THEN true ELSE false END AS "AUTO_INCREMENT"
             FROM information_schema.columns WHERE table_schema = $1
             ORDER BY table_name, ordinal_position`, [pgSchema]);

        const pkRes = await client.query(
            `SELECT tc.table_name AS "TABLE_NAME", kcu.column_name AS "COLUMN_NAME"
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
               ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
             WHERE tc.table_schema = $1 AND tc.constraint_type = 'PRIMARY KEY'
             ORDER BY tc.table_name, kcu.ordinal_position`, [pgSchema]);

        const idxRes = await client.query(
            `SELECT t.relname AS "TABLE_NAME", i.relname AS "INDEX_NAME",
                    a.attname AS "COLUMN_NAME", ix.indisunique AS "IS_UNIQUE"
             FROM pg_index ix
             JOIN pg_class t ON t.oid = ix.indrelid
             JOIN pg_class i ON i.oid = ix.indexrelid
             JOIN pg_namespace n ON n.oid = t.relnamespace
             JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
             WHERE n.nspname = $1 AND NOT ix.indisprimary
             ORDER BY t.relname, i.relname, a.attnum`, [pgSchema]);

        const fkRes = await client.query(
            `SELECT tc.table_name AS "TABLE_NAME", tc.constraint_name AS "CONSTRAINT_NAME",
                    kcu.column_name AS "COLUMN_NAME",
                    ccu.table_name AS "REFERENCED_TABLE_NAME",
                    ccu.column_name AS "REFERENCED_COLUMN_NAME",
                    rc.update_rule AS "UPDATE_RULE", rc.delete_rule AS "DELETE_RULE"
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
               ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
             JOIN information_schema.constraint_column_usage ccu
               ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
             JOIN information_schema.referential_constraints rc
               ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
             WHERE tc.table_schema = $1 AND tc.constraint_type = 'FOREIGN KEY'
             ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position`, [pgSchema]);

        const verRes = await client.query('SELECT version() AS version');
        const version = verRes.rows[0]?.version?.split(',')[0] || 'PostgreSQL';

        return {
            schema: buildSchema(tablesRes.rows, columnsRes.rows, pkRes.rows, idxRes.rows, fkRes.rows),
            version
        };
    } finally {
        await client.end();
    }
}

/* ================================================================
   Microsoft SQL Server
   ================================================================ */
async function fetchMssqlSchema(host, port, user, password, database) {
    const config = {
        server: host,
        port: parseInt(port) || 1433,
        database,
        options: { encrypt: false, trustServerCertificate: true }
    };

    // Support Windows Authentication (no user/password) or SQL auth
    if (user) {
        config.user = user;
        config.password = password || '';
    } else {
        config.options.trustedConnection = true;
    }

    const pool = await mssql.connect(config);

    try {
        const tablesRes = await pool.request().query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = '${database}'
             ORDER BY TABLE_NAME`);

        const columnsRes = await pool.request().query(
            `SELECT TABLE_NAME, COLUMN_NAME,
                    CASE WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL
                         THEN DATA_TYPE + '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')'
                         WHEN DATA_TYPE IN ('decimal','numeric')
                         THEN DATA_TYPE + '(' + CAST(NUMERIC_PRECISION AS VARCHAR) + ',' + CAST(ISNULL(NUMERIC_SCALE,0) AS VARCHAR) + ')'
                         ELSE DATA_TYPE END AS COLUMN_TYPE,
                    IS_NULLABLE,
                    COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS AUTO_INCREMENT
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_CATALOG = '${database}'
             ORDER BY TABLE_NAME, ORDINAL_POSITION`);

        const pkRes = await pool.request().query(
            `SELECT tc.TABLE_NAME, kcu.COLUMN_NAME
             FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
             JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
               ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
             WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' AND tc.TABLE_CATALOG = '${database}'
             ORDER BY tc.TABLE_NAME, kcu.ORDINAL_POSITION`);

        const idxRes = await pool.request().query(
            `SELECT t.name AS TABLE_NAME, i.name AS INDEX_NAME,
                    c.name AS COLUMN_NAME, i.is_unique AS IS_UNIQUE
             FROM sys.indexes i
             JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
             JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
             JOIN sys.tables t ON i.object_id = t.object_id
             WHERE i.is_primary_key = 0 AND i.type > 0
             ORDER BY t.name, i.name, ic.key_ordinal`);

        const fkRes = await pool.request().query(
            `SELECT tp.name AS TABLE_NAME, fk.name AS CONSTRAINT_NAME,
                    cp.name AS COLUMN_NAME,
                    tr.name AS REFERENCED_TABLE_NAME,
                    cr.name AS REFERENCED_COLUMN_NAME,
                    fk.update_referential_action_desc AS UPDATE_RULE,
                    fk.delete_referential_action_desc AS DELETE_RULE
             FROM sys.foreign_keys fk
             JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
             JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
             JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
             JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
             JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
             ORDER BY tp.name, fk.name, fkc.constraint_column_id`);

        const verRes = await pool.request().query('SELECT @@VERSION AS version');
        const version = (verRes.recordset[0]?.version || 'SQL Server').split('\n')[0];

        return {
            schema: buildSchema(
                tablesRes.recordset, columnsRes.recordset, pkRes.recordset,
                idxRes.recordset, fkRes.recordset
            ),
            version
        };
    } finally {
        await pool.close();
    }
}

/* ================================================================
   POST /api/connect
   Body: { dbType, host, port, user, password, database }
   Opens a persistent connection and stores it in the pool.
   ================================================================ */
app.post('/api/connect', async (req, res) => {
    if (connectionPool.size >= MAX_SESSIONS) {
        return res.status(503).json({ error: 'Maximum concurrent sessions reached. Disconnect an existing session first.' });
    }

    const { dbType, host, port, user, password, database } = req.body;
    if (!host || !database) {
        return res.status(400).json({ error: 'host and database are required.' });
    }

    let connection;

    try {
        let result;
        const type = (dbType || 'mysql').toLowerCase();

        switch (type) {
            case 'mysql':
            case 'mariadb': {
                result = await fetchMysqlSchema(host, port, user, password, database);
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
            connection, sessionId, dbType: type, database, version: result.version,
            schema: result.schema, lastActivity: Date.now(), timeoutHandle: null
        };
        connectionPool.set(sessionId, session);
        resetIdleTimer(sessionId);

        res.json({
            sessionId, dbType: type, database, version: result.version,
            tableCount: Object.keys(result.schema).length,
            schema: result.schema
        });
    } catch (err) {
        // Clean up any connection that was opened but not yet stored in the pool
        if (connection) {
            try {
                const type = (req.body.dbType || 'mysql').toLowerCase();
                if (type === 'mssql' || type === 'sqlserver') {
                    await connection.close();
                } else {
                    await connection.end();
                }
            } catch (e) { /* ignore cleanup errors */ }
        }
        console.error('Connect error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/* ================================================================
   POST /api/disconnect
   Body: { sessionId }
   Closes the persistent connection and removes it from the pool.
   ================================================================ */
app.post('/api/disconnect', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || !connectionPool.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found.' });
    }
    await closeSession(sessionId);
    res.json({ disconnected: true });
});

/* ================================================================
   POST /api/migrate
   Body: { sourceSessionId, targetSessionId, tables }
   Kicks off a background migration and returns a migrationId.
   ================================================================ */
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
        setTimeout(() => migrations.delete(migrationId), 30 * 60 * 1000);
    });

    res.json({ migrationId });
});

/* ================================================================
   GET /api/migrate/:id/status
   Returns current migration progress.
   ================================================================ */
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

/* ================================================================
   POST /api/migrate/:id/cancel
   Signals the running migration to stop after the current batch.
   ================================================================ */
app.post('/api/migrate/:id/cancel', (req, res) => {
    const state = migrations.get(req.params.id);
    if (!state) return res.status(404).json({ error: 'Migration not found.' });
    state.cancelFlag = true;
    res.json({ cancelled: true });
});

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
        'tinyint(1)': { targetType: 'bit', convert: v => (v === 1 || v === '1' || v === true) ? 1 : 0 },
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
        'bigserial': { targetType: 'bigint', skip: true },
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

/* ================================================================
   Migration Engine — runMigration and helper functions
   ================================================================ */
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

            // Disable FK checks on target (before truncate so FK-referenced tables can be cleared)
            await disableFKChecks(target);

            // Truncate if strategy requires
            if (tableConfig.strategy === 'truncate') {
                await truncateTable(target, tableConfig.name);
            }

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
            tableState.error = `After ${tableState.migratedRows} rows: ${err.message}`;
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
    // Schedule cleanup: delete migration state 30 min after terminal status
    // (gives clients time to fetch final status)
    setTimeout(() => migrations.delete(migrationId), 30 * 60 * 1000);
}

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
                const pkQuotedCols = columnMap.filter(c => c.isPK && !c.skip).map(c => quoteIdentifier(session.dbType, c.targetCol));
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
                            const setClause = quotedCols.map((c, i) => ({ c, i }))
                                .filter(({ c }) => !pkQuotedCols.includes(c))
                                .map(({ c, i }) => `${c} = ${values[i] === null ? 'NULL' : typeof values[i] === 'string' ? `N'${values[i].replace(/'/g, "''")}'` : values[i]}`).join(', ');
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

/* ================================================================
   POST /api/schema
   Body: { dbType, host, port, user, password, database }
   ================================================================ */
app.post('/api/schema', async (req, res) => {
    const { dbType, host, port, user, password, database } = req.body;

    if (!host || !database) {
        return res.status(400).json({ error: 'host and database are required.' });
    }

    try {
        let result;
        switch ((dbType || 'mysql').toLowerCase()) {
            case 'mysql':
            case 'mariadb':
                if (!user) return res.status(400).json({ error: 'username is required for MySQL/MariaDB.' });
                result = await fetchMysqlSchema(host, port, user, password, database);
                break;
            case 'postgres':
            case 'postgresql':
                if (!user) return res.status(400).json({ error: 'username is required for PostgreSQL.' });
                result = await fetchPostgresSchema(host, port, user, password, database);
                break;
            case 'mssql':
            case 'sqlserver':
                result = await fetchMssqlSchema(host, port, user, password, database);
                break;
            default:
                return res.status(400).json({ error: `Unsupported database type: ${dbType}` });
        }

        res.json({
            database,
            version: result.version,
            tableCount: Object.keys(result.schema).length,
            schema: result.schema
        });

    } catch (err) {
        console.error('Connection error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/schema-from-sql
 * Body: { sql: "..." }
 * Parse a SQL dump string and return schema JSON
 */
app.post('/api/schema-from-sql', (req, res) => {
    const { sql } = req.body;
    if (!sql) {
        return res.status(400).json({ error: 'sql field is required.' });
    }

    try {
        const schema = parseSqlDump(sql);
        res.json({
            database: 'SQL Import',
            version: 'Parsed from SQL dump',
            tableCount: Object.keys(schema).length,
            schema
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to parse SQL: ' + err.message });
    }
});

/**
 * Parse a SQL dump string into the schema format.
 * Supports MySQL (backticks), PostgreSQL (double-quotes), and SQL Server (brackets).
 */
function parseSqlDump(sql) {
    const schema = {};

    // Strip identifier quotes: `name`, "name", [name] → name
    const unquoteId = s => s.replace(/`|"|\[|\]/g, '');

    // Match CREATE TABLE blocks — broad enough for all dialects
    // Covers: ENGINE, DEFAULT, COLLATE, WITH, GO, ; at the end, or just a closing paren with optional extras before semicolon
    const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`[^`]+`|"[^"]+"|(\[[^\]]+\])|\w+)(?:\.(?:`[^`]+`|"[^"]+"|(\[[^\]]+\])|\w+))?\s*\(([\s\S]*?)\)\s*(?:ENGINE|DEFAULT|COLLATE|WITH\s*\(|;|GO|\n\s*\n)/gi;

    // Also capture schema-qualified names
    const nameRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\.)?(`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\s*\(/gi;

    let match;

    // First pass: extract table names
    const tableNames = [];
    while ((match = nameRegex.exec(sql)) !== null) {
        tableNames.push(unquoteId(match[1]).toLowerCase());
    }

    // Second pass: extract bodies
    let idx = 0;
    while ((match = createRegex.exec(sql)) !== null) {
        const tableName = tableNames[idx++];
        if (!tableName) continue;
        const body = match[3];

        const table = { columns: [], primary_keys: [], keys: [], foreign_keys: [] };

        const lines = body.split('\n').map(l => l.trim()).filter(l => l);
        for (const line of lines) {
            const clean = line.replace(/,\s*$/, '');

            // PRIMARY KEY
            const pkMatch = clean.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
            if (pkMatch) {
                table.primary_keys = pkMatch[1].split(',').map(c => unquoteId(c.trim()));
                continue;
            }

            // FOREIGN KEY — with or without CONSTRAINT name
            const fkMatch = clean.match(/(?:CONSTRAINT\s+(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\.)?(`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\s*\(([^)]+)\)(.*)$/i);
            if (fkMatch) {
                const constraintMatch = clean.match(/CONSTRAINT\s+(`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)/i);
                const fkName = constraintMatch ? unquoteId(constraintMatch[1]) : `fk_${tableName}_${table.foreign_keys.length}`;
                const actions = fkMatch[4] ? fkMatch[4].trim().replace(/,\s*$/, '') : '';
                table.foreign_keys.push({
                    name: fkName,
                    columns: fkMatch[1].split(',').map(c => unquoteId(c.trim())),
                    ref_table: unquoteId(fkMatch[2]).toLowerCase(),
                    ref_columns: fkMatch[3].split(',').map(c => unquoteId(c.trim())),
                    actions
                });
                continue;
            }

            // KEY / UNIQUE KEY / INDEX
            const keyMatch = clean.match(/(?:(UNIQUE)\s+)?(?:KEY|INDEX)\s+(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\s*\(([^)]+)\)/i);
            if (keyMatch) {
                const knMatch = clean.match(/(?:UNIQUE\s+)?(?:KEY|INDEX)\s+(`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)/i);
                const keyName = knMatch ? unquoteId(knMatch[1]) : `idx_${table.keys.length}`;
                table.keys.push({
                    name: keyName,
                    columns: keyMatch[2].split(',').map(c => unquoteId(c.trim()).replace(/\(\d+\)/, '')),
                    unique: !!keyMatch[1]
                });
                continue;
            }

            // Column definition — handles all quoting styles and serial/identity types
            const colMatch = clean.match(/^(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\s+(\S+(?:\([^)]*\))?(?:\s+unsigned)?)/i);
            const colNameMatch = clean.match(/^(`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)/i);
            if (colMatch && colNameMatch && !clean.match(/^(PRIMARY|KEY|INDEX|UNIQUE|CONSTRAINT|CHECK|FOREIGN|PERIOD)/i)) {
                const colName = unquoteId(colNameMatch[1]);
                let colType = colMatch[1];
                // Normalize PostgreSQL serial types
                const isSerial = /^(big)?serial$/i.test(colType);
                if (isSerial) colType = colType.toLowerCase() === 'bigserial' ? 'bigint' : 'int';
                table.columns.push({
                    name: colName,
                    type: colType,
                    nullable: !/NOT\s+NULL/i.test(clean),
                    auto_increment: /AUTO_INCREMENT/i.test(clean) || /IDENTITY/i.test(clean) || isSerial
                });
            }
        }

        schema[tableName] = table;
    }

    // Parse ALTER TABLE ... ADD FOREIGN KEY statements
    const alterFkRegex = /ALTER\s+TABLE\s+(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\s+ADD\s+(?:CONSTRAINT\s+(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\.)?(`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)\s*\(([^)]+)\)([^;]*)/gi;
    const alterTableNameRegex = /ALTER\s+TABLE\s+(`[^`]+`|"[^"]+"|\[[^\]]+\]|\w+)/i;

    let alterMatch;
    while ((alterMatch = alterFkRegex.exec(sql)) !== null) {
        const fullMatch = alterMatch[0];
        const tnMatch = fullMatch.match(alterTableNameRegex);
        if (!tnMatch) continue;
        const tName = unquoteId(tnMatch[1]).toLowerCase();
        if (!schema[tName]) continue;

        const fkCols = alterMatch[1].split(',').map(c => unquoteId(c.trim()));
        const refTable = unquoteId(alterMatch[2]).toLowerCase();
        const refCols = alterMatch[3].split(',').map(c => unquoteId(c.trim()));
        const actions = alterMatch[4] ? alterMatch[4].trim().replace(/,\s*$/, '') : '';
        const fkName = `fk_${tName}_${schema[tName].foreign_keys.length}`;

        schema[tName].foreign_keys.push({
            name: fkName,
            columns: fkCols,
            ref_table: refTable,
            ref_columns: refCols,
            actions
        });
    }

    return schema;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n  Database Diagram Tool running at:`);
    console.log(`  → http://localhost:${PORT}\n`);
});
