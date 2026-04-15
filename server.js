const express = require('express');
const mysql = require('mysql2/promise');
const { Client: PgClient } = require('pg');
const mssql = require('mssql');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Also serve the old static diagram pages from root
app.use(express.static(__dirname));

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
