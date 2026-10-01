# Database Explanation
DINE uses MySQL/InnoDB and normalized relational tables: restaurant tables, categories, menu items, orders, order items, status history, payments, waiter requests and activity logs.

## DBSE concepts demonstrated
- DDL: database/table/view/procedure/trigger definitions in `schema.sql`.
- DML: seed inserts plus runtime INSERT/UPDATE/DELETE through FastAPI.
- Primary and foreign keys: every transaction entity has a PK; relations use explicit FKs.
- Constraints: UNIQUE QR tokens, unique table numbers, unique payment per order, NOT NULL fields.
- DECIMAL: all money uses DECIMAL(10,2), never FLOAT.
- Indexes: order status/date/table, QR token, menu category, waiter status, activity timestamp.
- JOINs: views and ORM relationships connect tables/orders/items.
- Aggregates: SUM/COUNT/AVG/GROUP BY power admin analytics.
- Views: `active_orders_view` and `daily_sales_view`.
- Stored procedure: `sp_daily_sales(date)` demonstrates server-side reusable SQL.
- Trigger: `trg_payment_activity` logs DB payment insert events.
- Transactions/ACID: order creation and payment completion are atomic application transactions; errors roll back.

## Security decisions
The QR exposes a random token, not a trusted table number. Order prices are fetched from `menu_items` on the backend. Sold-out products are revalidated server-side.
