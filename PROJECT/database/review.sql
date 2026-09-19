-- DINE DATABASE REVIEW QUERIES
-- Run after database/setup.js has created dine_db.

USE dine_db;

-- 1) Show every application table.
SHOW TABLES;

-- 2) Show columns, data types, nullability and key markers.
SELECT
  TABLE_NAME,
  ORDINAL_POSITION,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_KEY,
  EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- 3) Show foreign-key relationships.
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME,
  CONSTRAINT_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;

-- 4) Review the most important transaction tables.
SELECT * FROM restaurant_tables ORDER BY table_number;
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20;
SELECT * FROM order_items ORDER BY id DESC LIMIT 30;
SELECT * FROM order_status_history ORDER BY id DESC LIMIT 30;
SELECT * FROM payments ORDER BY id DESC LIMIT 20;

-- 5) Demonstrate a relational join from orders to order lines/menu.
SELECT
  o.order_code,
  o.table_number,
  o.status,
  m.name AS menu_item,
  oi.quantity,
  oi.unit_price,
  oi.line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN menu_items m ON m.id = oi.menu_item_id
ORDER BY o.created_at DESC, oi.id;
