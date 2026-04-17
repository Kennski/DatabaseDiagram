# Migration Test Data

Almost-identical databases for exercising the data migration feature. Pick one pair.

**Source:** MySQL — `migration_source` (fully populated — shared by both pairs)

Pair A — **same-engine** (MySQL → MySQL, no PostgreSQL install needed):
- **Target:** MySQL — `migration_target` (same schema, stale copies of 2 users and 2 products)
- Tests: table matching, column mapping, all three conflict strategies, FK ordering, auto-increment skip.

Pair B — **cross-engine** (MySQL → PostgreSQL):
- **Target:** PostgreSQL — `migration_target`
- Adds coverage for type conversion:

| Source type (MySQL) | Target type (PostgreSQL) | What it tests |
|---|---|---|
| `TINYINT(1)` | `BOOLEAN` | `is_active`, `in_stock` value conversion |
| `DATETIME` | `TIMESTAMP` | timestamps pass through |
| `DECIMAL(10,2)` | `NUMERIC(10,2)` | direct compatibility |
| `INT AUTO_INCREMENT` | `SERIAL` | auto-increment columns are skipped so the target sequence is preserved |
| FK constraints | FK constraints | FK checks are disabled during migration |

## Setup

All scripts drop-and-recreate their database, so they are safe to re-run.

### Pair A: MySQL → MySQL

```bash
mysql -u root -p < test-data/source-mysql.sql
mysql -u root -p < test-data/target-mysql.sql
```

Both databases live on the same MySQL server, just with different names (`migration_source` and `migration_target`).

### Pair B: MySQL → PostgreSQL

```bash
mysql -u root -p < test-data/source-mysql.sql
psql -U postgres -f test-data/target-postgres.sql
```

## Test scenarios

Run the app, open `http://localhost:3000/dynamic-migrate.html`, and connect:

- **Source:** MySQL, host `localhost`, database `migration_source`
- **Target:** MySQL or PostgreSQL, host `localhost`, database `migration_target`

Then try each conflict strategy on the `users` and `products` tables to see the behaviours:

### Insert only (default)
- `users`: rows 3, 4, 5 inserted; rows 1, 2 **kept stale** (`Alice OLDNAME`, `Bob OLDNAME`) because duplicate PKs are skipped.
- `products`: rows 3-8 inserted; rows 1, 2 **kept stale**.
- `categories`, `orders`: all rows inserted (target was empty).

### Upsert
- `users`: rows 3, 4, 5 inserted; rows 1, 2 **overwritten** with source data (stale names replaced with `Alice Anderson`, `Bob Brown`).
- `products`: rows 3-8 inserted; rows 1, 2 overwritten with correct names and prices.
- `categories`, `orders`: all rows inserted.

### Truncate & replace
- `users`, `products`: target rows wiped first (⚠️ warning shown in Step 3), then all source rows inserted.
- The Step 3 review screen will show the explicit warning block for tables using this strategy.

## Other things to exercise

- **Cross-engine warning:** Step 3 highlights that type conversions will apply.
- **Auto-increment skip:** in the Step 2 column map, the `id` columns are marked skipped — the target's `SERIAL` sequence handles them.
- **Per-table strategy mix:** set `users` to Upsert, `products` to Truncate & replace, `categories` and `orders` to Insert only in the same run.
- **Cancel:** during Step 4, click Cancel — the migration stops after the current batch and already-migrated tables remain committed.
- **Confirmation gate:** in Step 3, the Start Migration button stays disabled until the checkbox is ticked *and* you type `migration_target` exactly.

## Reset between runs

Re-run both SQL scripts to restore the starting state.
