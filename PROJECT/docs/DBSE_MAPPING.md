# DBSE Mapping — Dine

This file is for documentation/viva. These labels are intentionally not displayed in the actual product UI.

## Relational modelling and normalization

The MySQL design separates tables, menu categories, menu items, allergens, ingredients, recipes, orders, order items, status history and payments. Repeating groups such as allergens are handled through junction tables instead of comma-separated columns.

## Keys and constraints

`database/schema.sql` uses primary keys, foreign keys, unique constraints, composite uniqueness, `CHECK` constraints and controlled `ENUM` states. The 12 table QR tokens are unique.

## DDL and DML

The schema defines the database structure; `seed.sql` inserts the initial 12 restaurant tables, 32 menu items, ingredients, allergens and recipes.

## Joins and aggregation

Kitchen bills, analytics and dashboard operations combine orders, order items and menu items. `analytics_queries.sql` contains multi-table joins and grouped sales queries.

## Indexing

Indexes support frequent access patterns such as status + time kitchen queues, table-order history, payment status, menu-item lookup and order status history.

## Transactions and ACID

The MySQL `placeOrder()` operation in `backend/src/store.js` obtains a connection, starts a transaction, validates/locks the table and menu rows, inserts the order and order lines, marks the table active, then commits. Any failure executes a rollback.

Payment completion is also transactional: the order payment status and payment record are committed together.

## Triggers

`advanced.sql` contains:

- order creation/status audit history trigger
- inventory reduction trigger when an order item is inserted

## Stored procedure

`sp_update_order_status` validates the requested kitchen state and updates the order. MySQL mode calls this procedure from the application.

## Stored function

`fn_order_total` calculates an order amount from its order lines and GST.

## Views

- `v_kitchen_queue`
- `v_order_bill`
- `v_daily_sales`

These provide reusable logical data representations for operational and reporting queries.

## CTEs and window functions

`analytics_queries.sql` demonstrates:

- CTE for item sales
- `DENSE_RANK()` for category-level dish ranking
- running revenue using `SUM() OVER(...)`

## Database-backed business rules

The exact menu price is copied into `order_items.unit_price` when an order is placed. This is important: a future menu price change cannot alter an existing customer's bill.

Table identity is validated using both table number and a unique QR token. Order state and payment state are stored independently, and the table is released only when the order is served and payment is complete.
