# Dine Database Layer

This folder contains the relational MySQL implementation used for the DBSE review.

## Main files

- `schema.sql` — tables, primary keys, foreign keys, constraints and indexes.
- `seed.sql` — restaurant tables, menu, ingredients and initial records.
- `advanced.sql` — DBSE advanced database objects such as triggers, procedures, functions and views.
- `analytics_queries.sql` — joins, aggregation, CTEs and window-function examples.
- `setup.js` — creates and initializes the MySQL database.
- `review.js` — read-only terminal review of tables, columns, keys, relationships and row counts.
- `review.sql` — ready-to-run SQL queries for a manual database review.

## Setup

From the project root:

```powershell
copy .env.example .env
npm install mysql2
npm run db:setup
```

Set `USE_MYSQL=true` in `.env` when you want the full application to use MySQL.

## Database review

```powershell
npm run db:review
```

Inspect one table only:

```powershell
npm run db:review -- --table orders
```

The review command is read-only and does not modify records.
