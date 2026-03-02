const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Also serve the old static diagram pages from root
app.use(express.static(__dirname));

/**
 * POST /api/schema
 * Body: { host, port, user, password, database }
 * Returns the parsed schema JSON in the same format as schema.json
 */
app.post('/api/schema', async (req, res) => {
    const { host, port, user, password, database } = req.body;

    if (!host || !database || !user) {
        return res.status(400).json({ error: 'host, user, and database are required.' });
    }

    let connection;
    try {
        connection = await mysql.createConnection({
            host,
            port: parseInt(port) || 3306,
            user,
            password: password || '',
            database
        });

        // 1. Get all tables
        const [tables] = await connection.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
             ORDER BY TABLE_NAME`,
            [database]
        );

        // 2. Get all columns
        const [columns] = await connection.query(
            `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, EXTRA, COLUMN_KEY
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ?
             ORDER BY TABLE_NAME, ORDINAL_POSITION`,
            [database]
        );

        // 3. Get primary keys
        const [primaryKeys] = await connection.query(
            `SELECT tc.TABLE_NAME, kcu.COLUMN_NAME
             FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
             JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
               ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
               AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
               AND tc.TABLE_NAME = kcu.TABLE_NAME
             WHERE tc.TABLE_SCHEMA = ? AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
             ORDER BY tc.TABLE_NAME, kcu.ORDINAL_POSITION`,
            [database]
        );

        // 4. Get indexes/keys
        const [indexes] = await connection.query(
            `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
             FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = ? AND INDEX_NAME != 'PRIMARY'
             ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
            [database]
        );

        // 5. Get foreign keys
        const [foreignKeys] = await connection.query(
            `SELECT 
               tc.TABLE_NAME,
               tc.CONSTRAINT_NAME,
               kcu.COLUMN_NAME,
               kcu.REFERENCED_TABLE_NAME,
               kcu.REFERENCED_COLUMN_NAME,
               rc.UPDATE_RULE,
               rc.DELETE_RULE
             FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
             JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
               ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
               AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
               AND tc.TABLE_NAME = kcu.TABLE_NAME
             JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
               ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
               AND tc.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
             WHERE tc.TABLE_SCHEMA = ? AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
             ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
            [database]
        );

        // Build schema object
        const schema = {};

        // Initialize tables
        for (const row of tables) {
            schema[row.TABLE_NAME] = {
                columns: [],
                primary_keys: [],
                keys: [],
                foreign_keys: []
            };
        }

        // Add columns
        for (const col of columns) {
            if (!schema[col.TABLE_NAME]) continue;
            schema[col.TABLE_NAME].columns.push({
                name: col.COLUMN_NAME,
                type: col.COLUMN_TYPE,
                nullable: col.IS_NULLABLE === 'YES',
                auto_increment: (col.EXTRA || '').includes('auto_increment')
            });
        }

        // Add primary keys
        for (const pk of primaryKeys) {
            if (!schema[pk.TABLE_NAME]) continue;
            schema[pk.TABLE_NAME].primary_keys.push(pk.COLUMN_NAME);
        }

        // Add indexes
        const indexMap = {};
        for (const idx of indexes) {
            if (!schema[idx.TABLE_NAME]) continue;
            const key = `${idx.TABLE_NAME}::${idx.INDEX_NAME}`;
            if (!indexMap[key]) {
                indexMap[key] = { table: idx.TABLE_NAME, name: idx.INDEX_NAME, columns: [], unique: idx.NON_UNIQUE === 0 };
            }
            indexMap[key].columns.push(idx.COLUMN_NAME);
        }
        for (const idx of Object.values(indexMap)) {
            schema[idx.table].keys.push({
                name: idx.name,
                columns: idx.columns,
                unique: idx.unique
            });
        }

        // Add foreign keys
        const fkMap = {};
        for (const fk of foreignKeys) {
            if (!schema[fk.TABLE_NAME]) continue;
            const key = `${fk.TABLE_NAME}::${fk.CONSTRAINT_NAME}`;
            if (!fkMap[key]) {
                fkMap[key] = {
                    table: fk.TABLE_NAME,
                    name: fk.CONSTRAINT_NAME,
                    columns: [],
                    ref_table: fk.REFERENCED_TABLE_NAME,
                    ref_columns: [],
                    actions: `ON UPDATE ${fk.UPDATE_RULE} ON DELETE ${fk.DELETE_RULE}`
                };
            }
            fkMap[key].columns.push(fk.COLUMN_NAME);
            fkMap[key].ref_columns.push(fk.REFERENCED_COLUMN_NAME);
        }
        for (const fk of Object.values(fkMap)) {
            schema[fk.table].foreign_keys.push({
                name: fk.name,
                columns: fk.columns,
                ref_table: fk.ref_table,
                ref_columns: fk.ref_columns,
                actions: fk.actions
            });
        }

        // Get database version info
        const [versionRows] = await connection.query('SELECT VERSION() as version');
        const version = versionRows[0]?.version || 'Unknown';

        await connection.end();

        res.json({
            database,
            version,
            tableCount: Object.keys(schema).length,
            schema
        });

    } catch (err) {
        if (connection) {
            try { await connection.end(); } catch (_) {}
        }
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
 * Parse a SQL dump string into the schema format
 */
function parseSqlDump(sql) {
    const schema = {};
    // Match CREATE TABLE blocks
    const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(([\s\S]*?)\)\s*(?:ENGINE|DEFAULT|COLLATE|;)/gi;
    let match;

    while ((match = createRegex.exec(sql)) !== null) {
        const tableName = match[1].toLowerCase();
        const body = match[2];

        const table = { columns: [], primary_keys: [], keys: [], foreign_keys: [] };

        const lines = body.split('\n').map(l => l.trim()).filter(l => l);
        for (const line of lines) {
            const clean = line.replace(/,\s*$/, '');

            // PRIMARY KEY
            const pkMatch = clean.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
            if (pkMatch) {
                table.primary_keys = pkMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
                continue;
            }

            // FOREIGN KEY
            const fkMatch = clean.match(/CONSTRAINT\s+`?(\w+)`?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)(.*)$/i);
            if (fkMatch) {
                const actions = fkMatch[5] ? fkMatch[5].trim().replace(/,\s*$/, '') : '';
                table.foreign_keys.push({
                    name: fkMatch[1],
                    columns: fkMatch[2].split(',').map(c => c.trim().replace(/`/g, '')),
                    ref_table: fkMatch[3].replace(/`/g, '').toLowerCase(),
                    ref_columns: fkMatch[4].split(',').map(c => c.trim().replace(/`/g, '')),
                    actions
                });
                continue;
            }

            // KEY / UNIQUE KEY / INDEX
            const keyMatch = clean.match(/(?:(UNIQUE)\s+)?(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)/i);
            if (keyMatch) {
                table.keys.push({
                    name: keyMatch[2],
                    columns: keyMatch[3].split(',').map(c => c.trim().replace(/`/g, '').replace(/\(\d+\)/, '')),
                    unique: !!keyMatch[1]
                });
                continue;
            }

            // Column definition
            const colMatch = clean.match(/^`?(\w+)`?\s+(\S+(?:\([^)]*\))?(?:\s+unsigned)?)/i);
            if (colMatch && !clean.match(/^(PRIMARY|KEY|INDEX|UNIQUE|CONSTRAINT|CHECK|FOREIGN)/i)) {
                table.columns.push({
                    name: colMatch[1],
                    type: colMatch[2],
                    nullable: !/NOT\s+NULL/i.test(clean),
                    auto_increment: /AUTO_INCREMENT/i.test(clean)
                });
            }
        }

        schema[tableName] = table;
    }

    return schema;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n  Database Diagram Tool running at:`);
    console.log(`  → http://localhost:${PORT}\n`);
    console.log(`  Static diagrams:`);
    console.log(`  → http://localhost:${PORT}/database_diagram.html`);
    console.log(`  → http://localhost:${PORT}/visual_diagram.html\n`);
});
