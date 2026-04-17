-- Migration test: TARGET database (MySQL)
-- Same-engine variant — use this if you don't want to install PostgreSQL.
-- Pairs with source-mysql.sql.

DROP DATABASE IF EXISTS migration_target;
CREATE DATABASE migration_target;
USE migration_target;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    bio TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    in_stock TINYINT(1) NOT NULL DEFAULT 1,
    category_id INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    ordered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Stale data that overlaps source by primary key.
-- With "Insert only": these two stale rows remain (dupes skipped).
-- With "Upsert": these two rows get overwritten with source data.
-- With "Truncate & replace": these rows get wiped first, then all source rows inserted.
INSERT INTO users (id, name, email, is_active, bio, created_at) VALUES
(1, 'Alice OLDNAME', 'alice@example.com', 1, 'stale bio', '2025-12-01 00:00:00'),
(2, 'Bob OLDNAME',   'bob@example.com',   0, 'stale bio', '2025-12-02 00:00:00');

INSERT INTO products (id, name, price, in_stock, category_id, created_at) VALUES
(1, 'Widget (outdated)', 19.99, 0, NULL, '2025-12-01 00:00:00'),
(2, 'Gadget (outdated)', 29.50, 0, NULL, '2025-12-02 00:00:00');

-- categories and orders start empty.
