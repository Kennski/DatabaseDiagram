-- Migration test: TARGET database (PostgreSQL)
-- Run this in your PostgreSQL server to create an almost-empty target database
-- with stale copies of a couple of rows so the upsert / truncate strategies
-- produce clearly different outcomes.

-- Run this part while connected to the 'postgres' (or any admin) database:
DROP DATABASE IF EXISTS migration_target;
CREATE DATABASE migration_target;

-- Then connect to migration_target and run the rest.
-- In psql:  \c migration_target
-- Otherwise reconnect in your client to the new database.

\c migration_target

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    bio TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    ordered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Stale data that overlaps source by primary key.
-- With "Insert only": these two stale rows remain (dupes skipped).
-- With "Upsert": these two rows get overwritten with source data.
-- With "Truncate & replace": these rows get wiped first, then all source rows inserted.
INSERT INTO users (id, name, email, is_active, bio, created_at) OVERRIDING SYSTEM VALUE VALUES
(1, 'Alice OLDNAME', 'alice@example.com', true,  'stale bio', '2025-12-01 00:00:00'),
(2, 'Bob OLDNAME',   'bob@example.com',   false, 'stale bio', '2025-12-02 00:00:00');

INSERT INTO products (id, name, price, in_stock, category_id, created_at) OVERRIDING SYSTEM VALUE VALUES
(1, 'Widget (outdated)', 19.99, false, NULL, '2025-12-01 00:00:00'),
(2, 'Gadget (outdated)', 29.50, false, NULL, '2025-12-02 00:00:00');

-- categories and orders start empty.

-- Sync the SERIAL sequences so new auto-IDs don't collide with existing/incoming rows.
SELECT setval(pg_get_serial_sequence('users', 'id'),       (SELECT COALESCE(MAX(id), 0) FROM users));
SELECT setval(pg_get_serial_sequence('products', 'id'),    (SELECT COALESCE(MAX(id), 0) FROM products));
SELECT setval(pg_get_serial_sequence('categories', 'id'),  1, false);
SELECT setval(pg_get_serial_sequence('orders', 'id'),      1, false);
