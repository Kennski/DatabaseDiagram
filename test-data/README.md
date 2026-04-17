# Migration Test Data

Two almost-identical databases for exercising the data migration feature.

- **Source:** MySQL — `migration_source` (fully populated)
- **Target:** PostgreSQL — `migration_target` (schema + stale copies of 2 users and 2 products)

The cross-engine pair covers the interesting conversions automatically:

| Source type (MySQL) | Target type (PostgreSQL) | What it tests |
|---|---|---|
| `TINYINT(1)` | `BOOLEAN` | `is_active`, `in_stock` value conversion |
| `DATETIME` | `TIMESTAMP` | timestamps pass through |
| `DECIMAL(10,2)` | `NUMERIC(10,2)` | direct compatibility |
| `INT AUTO_INCREMENT` | `SERIAL` | auto-increment columns are skipped so the target sequence is preserved |
| FK constraints | FK constraints | FK checks are disabled during migration |

## Setup

Run `source-mysql.sql` on your MySQL server and `target-postgres.sql` on your PostgreSQL server. Both scripts drop-and-recreate their database, so they are safe to re-run.

```bash
# MySQL
mysql -u root -p < test-data/source-mysql.sql

# PostgreSQL (run while connected as a superuser like 'postgres')
psql -U postgres -f test-data/target-postgres.sql
```

## Test scenarios

Run the app, open `http://localhost:3000/dynamic-migrate.html`, and connect:

- **Source:** MySQL, host `localhost`, database `migration_source`
- **Target:** PostgreSQL, host `localhost`, database `migration_target`

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
