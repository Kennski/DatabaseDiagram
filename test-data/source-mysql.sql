-- Migration test: SOURCE database (MySQL)
-- Run this in your MySQL server to create a populated source database.
-- Pair with target-postgres.sql to test the migration wizard.

DROP DATABASE IF EXISTS migration_source;
CREATE DATABASE migration_source;
USE migration_source;

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

-- Users: 5 rows (target will have stale copies of 1 and 2)
INSERT INTO users (id, name, email, is_active, bio, created_at) VALUES
(1, 'Alice Anderson',  'alice@example.com', 1, 'Product manager and hiker.',      '2026-01-15 09:30:00'),
(2, 'Bob Brown',       'bob@example.com',   1, 'Backend engineer.',               '2026-01-20 11:15:00'),
(3, 'Carol Chen',      'carol@example.com', 0, 'On sabbatical.',                  '2026-02-01 14:22:00'),
(4, 'David Davis',     'david@example.com', 1, NULL,                              '2026-02-10 08:45:00'),
(5, 'Emma Evans',      'emma@example.com',  1, 'Designer. Coffee enthusiast.',    '2026-03-05 16:10:00');

-- Categories: 3 rows (target starts empty)
INSERT INTO categories (id, name, description) VALUES
(1, 'Electronics', 'Gadgets and gizmos'),
(2, 'Home Goods',  'For around the house'),
(3, 'Outdoor',     'Outdoor equipment and gear');

-- Products: 8 rows (target will have stale copies of 1 and 2)
INSERT INTO products (id, name, price, in_stock, category_id, created_at) VALUES
(1, 'Widget Pro',      29.99,  1, 1, '2026-01-01 00:00:00'),
(2, 'Gadget Max',      49.50,  1, 1, '2026-01-05 00:00:00'),
(3, 'Thingamajig',     12.00,  0, 2, '2026-01-10 00:00:00'),
(4, 'Doohickey',        8.75,  1, 2, '2026-02-01 00:00:00'),
(5, 'Contraption',     99.99,  1, 3, '2026-02-15 00:00:00'),
(6, 'Gizmo XL',       149.00,  0, 1, '2026-03-01 00:00:00'),
(7, 'Whatsit Deluxe',  75.25,  1, 3, '2026-03-10 00:00:00'),
(8, 'Sproggle',        19.99,  1, 2, '2026-03-20 00:00:00');

-- Orders: 10 rows (target starts empty)
INSERT INTO orders (id, user_id, product_id, quantity, ordered_at) VALUES
(1,  1, 1, 2, '2026-03-01 10:00:00'),
(2,  1, 3, 1, '2026-03-02 11:30:00'),
(3,  2, 2, 1, '2026-03-05 14:00:00'),
(4,  2, 5, 3, '2026-03-08 09:15:00'),
(5,  3, 1, 1, '2026-03-12 16:45:00'),
(6,  4, 7, 2, '2026-03-15 08:30:00'),
(7,  5, 4, 5, '2026-03-18 13:20:00'),
(8,  5, 8, 1, '2026-03-22 17:00:00'),
(9,  4, 5, 1, '2026-03-25 12:10:00'),
(10, 1, 6, 1, '2026-03-28 19:05:00');
